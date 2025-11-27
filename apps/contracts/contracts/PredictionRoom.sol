// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PredictionRoom
 * @notice A contract for stock price prediction betting on Nigerian stocks
 * @dev Optimized for Celo network with cUSD as the native stablecoin
 */

contract PredictionRoom {
    // ============================================================================
    // ENUMS & STRUCTS
    // ============================================================================

    enum RoomStatus {
        WAITING, // Room created, accepting predictions
        ACTIVE, // Game started, waiting for resolution
        COMPLETED // Game resolved, payouts available
    }

    enum PredictionDirection {
        NONE,
        UP,
        DOWN
    }

    struct Room {
        uint256 id;
        address creator;
        string name;
        string symbol;
        uint256 startTime;
        uint256 endTime;
        uint256 minStake;
        uint256 startingPrice;
        uint256 endingPrice;
        RoomStatus status;
        uint256 totalUpStake;
        uint256 totalDownStake;
        bool pricesSet;
        bool settled; // Prevent multiple resolutions
    }

    struct Prediction {
        address predictor;
        uint256 roomId;
        PredictionDirection direction;
        uint256 amount;
        bool claimed;
        uint256 payout;
    }

    // ============================================================================
    // STATE VARIABLES
    // ============================================================================

    mapping(uint256 => Room) public rooms;
    mapping(uint256 => mapping(address => Prediction[])) public userPredictions;
    mapping(uint256 => address[]) public roomPredictors;

    uint256 public nextRoomId = 1;
    address public owner;

    // Track all predictions for a room to calculate payouts
    mapping(uint256 => Prediction[]) public roomAllPredictions;

    // ============================================================================
    // EVENTS
    // ============================================================================

    event RoomCreated(
        uint256 indexed roomId,
        address indexed creator,
        string name,
        string symbol,
        uint256 minStake,
        uint256 duration
    );

    event PredictionPlaced(
        uint256 indexed roomId,
        address indexed predictor,
        PredictionDirection direction,
        uint256 amount
    );

    event RoomStarted(uint256 indexed roomId, uint256 startingPrice);

    event RoomResolved(
        uint256 indexed roomId,
        uint256 endingPrice,
        PredictionDirection result
    );

    event PayoutClaimed(
        address indexed user,
        uint256 indexed roomId,
        uint256 amount
    );

    event RoomCancelled(uint256 indexed roomId);

    // ============================================================================
    // ERRORS
    // ============================================================================

    error RoomAlreadyExists();
    error RoomNotFound();
    error RoomNotWaiting();
    error RoomNotActive();
    error RoomAlreadyStarted();
    error InvalidAmount();
    error InvalidPrice();
    error InvalidDirection();
    error UserAlreadyPredicted();
    error RoomNotResolved();
    error NothingToClaim();
    error TransferFailed();
    error Unauthorized();
    error InvalidTimestamp();
    error RoomAlreadySettled();

    // ============================================================================
    // MODIFIERS
    // ============================================================================

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier roomExists(uint256 roomId) {
        if (rooms[roomId].creator == address(0)) revert RoomNotFound();
        _;
    }

    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================

    constructor() {
        owner = msg.sender;
    }

    // ============================================================================
    // ROOM CREATION & MANAGEMENT
    // ============================================================================

    /**
     * @notice Create a new prediction room
     * @param name Room name (e.g., "MTN Stock Price Movement")
     * @param symbol Stock symbol (e.g., "MTN.NG")
     * @param durationMinutes Duration in minutes
     * @param minStakeWei Minimum stake in wei (cUSD)
     */
    function createRoom(
        string memory name,
        string memory symbol,
        uint256 durationMinutes,
        uint256 minStakeWei
    ) external returns (uint256 roomId) {
        if (durationMinutes == 0) revert InvalidTimestamp();
        if (minStakeWei == 0) revert InvalidAmount();

        roomId = nextRoomId++;
        uint256 durationSeconds = durationMinutes * 60;
        uint256 endTime = block.timestamp + durationSeconds;

        rooms[roomId] = Room({
            id: roomId,
            creator: msg.sender,
            name: name,
            symbol: symbol,
            startTime: 0,
            endTime: endTime,
            minStake: minStakeWei,
            startingPrice: 0,
            endingPrice: 0,
            status: RoomStatus.WAITING,
            totalUpStake: 0,
            totalDownStake: 0,
            pricesSet: false,
            settled: false
        });

        emit RoomCreated(
            roomId,
            msg.sender,
            name,
            symbol,
            minStakeWei,
            durationMinutes
        );
    }

    /**
     * @notice Start a room (only creator can call)
     * @param roomId The room to start
     * @param startingPrice The starting price in wei
     */
    function startRoom(
        uint256 roomId,
        uint256 startingPrice
    ) external roomExists(roomId) {
        Room storage room = rooms[roomId];

        if (msg.sender != room.creator) revert Unauthorized();
        if (room.status != RoomStatus.WAITING) revert RoomNotWaiting();
        if (startingPrice == 0) revert InvalidPrice();

        room.status = RoomStatus.ACTIVE;
        room.startingPrice = startingPrice;
        room.startTime = block.timestamp;

        emit RoomStarted(roomId, startingPrice);
    }

    /**
     * @notice Resolve a room and auto-distribute payouts to all winners
     * @dev Can be called by ANY player once the room is ACTIVE
     * @param roomId The room to resolve
     * @param endingPrice The final price in wei
     */
    function resolveRoom(
        uint256 roomId,
        uint256 endingPrice
    ) external roomExists(roomId) {
        Room storage room = rooms[roomId];

        // Validate room state
        if (room.status != RoomStatus.ACTIVE) revert RoomNotActive();
        if (endingPrice == 0) revert InvalidPrice();
        if (room.settled) revert RoomAlreadySettled(); // Prevent double settlement

        // Mark as settled immediately to prevent re-entrancy
        room.settled = true;
        room.endingPrice = endingPrice;
        room.status = RoomStatus.COMPLETED;
        room.pricesSet = true;

        // Determine winning direction
        PredictionDirection winningDirection = endingPrice > room.startingPrice
            ? PredictionDirection.UP
            : PredictionDirection.DOWN;

        // Auto-distribute payouts to all winners
        address[] memory predictors = roomPredictors[roomId];
        uint256 totalWinnerStake = winningDirection == PredictionDirection.UP
            ? room.totalUpStake
            : room.totalDownStake;

        // Only distribute if there are winners
        if (totalWinnerStake > 0) {
            uint256 totalPool = room.totalUpStake + room.totalDownStake;

            for (uint256 i = 0; i < predictors.length; i++) {
                address predictor = predictors[i];
                Prediction[] storage predictions = userPredictions[roomId][
                    predictor
                ];

                for (uint256 j = 0; j < predictions.length; j++) {
                    Prediction storage prediction = predictions[j];

                    // Skip if already claimed or not a winner
                    if (prediction.claimed) continue;
                    if (prediction.direction != winningDirection) continue;

                    // Mark as claimed and calculate payout
                    prediction.claimed = true;
                    uint256 payout = (prediction.amount * totalPool) /
                        totalWinnerStake;
                    prediction.payout = payout;

                    // Transfer payout to winner
                    (bool success, ) = predictor.call{value: payout}("");
                    if (!success) revert TransferFailed();

                    emit PayoutClaimed(predictor, roomId, payout);
                }
            }
        }

        emit RoomResolved(roomId, endingPrice, winningDirection);
    }

    /**
     * @notice Cancel a room (only owner can call, only if WAITING)
     * @param roomId The room to cancel
     */
    function cancelRoom(uint256 roomId) external roomExists(roomId) onlyOwner {
        Room storage room = rooms[roomId];

        if (room.status != RoomStatus.WAITING) revert RoomNotWaiting();

        room.status = RoomStatus.COMPLETED;

        emit RoomCancelled(roomId);
    }

    // ============================================================================
    // PREDICTION PLACEMENT
    // ============================================================================

    /**
     * @notice Place a prediction (payable)
     * @param roomId The room to predict in
     * @param direction UP or DOWN
     */
    function predict(
        uint256 roomId,
        PredictionDirection direction
    ) external payable roomExists(roomId) {
        Room storage room = rooms[roomId];
        uint256 amount = msg.value;

        // Validations
        if (room.status != RoomStatus.WAITING) revert RoomNotWaiting();
        if (block.timestamp >= room.endTime) revert RoomAlreadyStarted();
        if (amount < room.minStake) revert InvalidAmount();
        if (direction == PredictionDirection.NONE) revert InvalidDirection();

        // Check if user already predicted in this room
        Prediction[] storage userRoomPredictions = userPredictions[roomId][
            msg.sender
        ];
        if (userRoomPredictions.length > 0) revert UserAlreadyPredicted();

        // Create prediction
        Prediction memory newPrediction = Prediction({
            predictor: msg.sender,
            roomId: roomId,
            direction: direction,
            amount: amount,
            claimed: false,
            payout: 0
        });

        // Track in user's predictions
        userPredictions[roomId][msg.sender].push(newPrediction);

        // Track in room's all predictions
        roomAllPredictions[roomId].push(newPrediction);

        // Add to predictor list if first prediction
        if (userRoomPredictions.length == 0) {
            roomPredictors[roomId].push(msg.sender);
        }

        // Update pool totals
        if (direction == PredictionDirection.UP) {
            room.totalUpStake += amount;
        } else {
            room.totalDownStake += amount;
        }

        emit PredictionPlaced(roomId, msg.sender, direction, amount);
    }

    // ============================================================================
    // PAYOUT & CLAIMING
    // ============================================================================

    /**
     * @notice Claim winnings from a resolved room
     * @dev Deprecated: Payouts are now auto-distributed when resolveRoom() is called
     * @param roomId The room to claim from
     */
    function claim(uint256 roomId) external roomExists(roomId) {
        Room memory room = rooms[roomId];

        if (room.status != RoomStatus.COMPLETED) revert RoomNotResolved();
        if (!room.pricesSet) revert RoomNotResolved();

        Prediction[] storage userRoomPredictions = userPredictions[roomId][
            msg.sender
        ];
        if (userRoomPredictions.length == 0) revert NothingToClaim();

        // Check if user has any unclaimed payouts
        bool hasUnclaimed = false;
        for (uint256 i = 0; i < userRoomPredictions.length; i++) {
            if (
                !userRoomPredictions[i].claimed &&
                userRoomPredictions[i].payout > 0
            ) {
                hasUnclaimed = true;
                break;
            }
        }

        if (!hasUnclaimed) revert NothingToClaim();

        // This is a fallback for any unclaimed payouts (shouldn't happen normally)
        uint256 totalPayout = 0;
        PredictionDirection winningDirection = room.endingPrice >
            room.startingPrice
            ? PredictionDirection.UP
            : PredictionDirection.DOWN;

        for (uint256 i = 0; i < userRoomPredictions.length; i++) {
            Prediction storage prediction = userRoomPredictions[i];

            if (prediction.claimed) continue;

            prediction.claimed = true;

            if (prediction.direction == winningDirection) {
                uint256 payout = calculatePayout(
                    roomId,
                    prediction.amount,
                    prediction.direction
                );
                totalPayout += payout;
                prediction.payout = payout;
            }
        }

        if (totalPayout == 0) revert NothingToClaim();

        // Transfer payout
        (bool success, ) = msg.sender.call{value: totalPayout}("");
        if (!success) revert TransferFailed();

        emit PayoutClaimed(msg.sender, roomId, totalPayout);
    }

    /**
     * @notice Calculate payout for a winning prediction
     * @param roomId The room
     * @param wagerAmount The wager amount
     * @param direction The prediction direction
     */
    function calculatePayout(
        uint256 roomId,
        uint256 wagerAmount,
        PredictionDirection direction
    ) public view roomExists(roomId) returns (uint256) {
        Room memory room = rooms[roomId];

        uint256 winnerStake = direction == PredictionDirection.UP
            ? room.totalUpStake
            : room.totalDownStake;

        if (winnerStake == 0) return 0;

        uint256 totalPool = room.totalUpStake + room.totalDownStake;
        return (wagerAmount * totalPool) / winnerStake;
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    /**
     * @notice Get room details
     */
    function getRoom(
        uint256 roomId
    ) external view roomExists(roomId) returns (Room memory) {
        return rooms[roomId];
    }

    /**
     * @notice Get user's prediction in a room
     */
    function getUserPrediction(
        uint256 roomId,
        address user
    ) external view returns (Prediction[] memory) {
        return userPredictions[roomId][user];
    }

    /**
     * @notice Get all predictors in a room
     */
    function getRoomPredictors(
        uint256 roomId
    ) external view returns (address[] memory) {
        return roomPredictors[roomId];
    }

    /**
     * @notice Get all predictions in a room
     */
    function getRoomPredictions(
        uint256 roomId
    ) external view returns (Prediction[] memory) {
        return roomAllPredictions[roomId];
    }

    /**
     * @notice Get prediction count in a room by direction
     */
    function getPredictionCounts(
        uint256 roomId
    ) external view returns (uint256 upCount, uint256 downCount) {
        Prediction[] memory predictions = roomAllPredictions[roomId];
        for (uint256 i = 0; i < predictions.length; i++) {
            if (predictions[i].direction == PredictionDirection.UP) {
                upCount++;
            } else if (predictions[i].direction == PredictionDirection.DOWN) {
                downCount++;
            }
        }
    }

    /**
     * @notice Check if a user has already predicted in a room
     */
    function hasUserPredicted(
        uint256 roomId,
        address user
    ) external view returns (bool) {
        return userPredictions[roomId][user].length > 0;
    }

    // ============================================================================
    // ADMIN FUNCTIONS
    // ============================================================================

    /**
     * @notice Withdraw contract balance (owner only)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert InvalidAmount();

        (bool success, ) = owner.call{value: balance}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Change owner (owner only)
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert Unauthorized();
        owner = newOwner;
    }

    // ============================================================================
    // FALLBACK
    // ============================================================================

    receive() external payable {}
}

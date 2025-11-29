-- Add contract_room_id column to store the smart contract's uint256 roomId
ALTER TABLE rooms 
ADD COLUMN contract_room_id INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN rooms.contract_room_id IS 'The uint256 roomId from the PredictionRoom smart contract. Used for on-chain interactions.';

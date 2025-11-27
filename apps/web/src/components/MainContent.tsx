"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
import Image from "next/image";
import Logo from "@/components/Logo";
import { RoomCard } from "./RoomCard";
import { Room } from "@/lib/types";
import { AVAILABLE_STOCKS } from "@/lib/stocks";
import { useAvailableStocks } from "@/hooks/useRoomQueries";
import { LoadingRoomList } from "./LoadingRoomCard";

interface MainContentProps {
  rooms: Room[];
  myRooms: Room[];
  isLoading?: boolean;
  onJoinRoom: (roomId: string) => void;
  onViewOwnedRoomDetails?: (roomId: string) => void;
  onCreateRoom?: (roomData: {
    name: string;
    symbol: string;
    timeDuration: string;
    minStake: string;
  }) => void;
}

export function MainContent({
  rooms,
  myRooms,
  isLoading = false,
  onJoinRoom,
  onViewOwnedRoomDetails,
  onCreateRoom,
}: MainContentProps) {
  const [activeRoomTab, setActiveRoomTab] = useState<"all" | "created">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: "",
    symbol: "",
    timeDuration: "",
    minStake: "",
  });

  // Fetch available stocks using React Query
  const { data: stocksResponse, isLoading: loadingStocks } =
    useAvailableStocks();
  const availableStocks = stocksResponse?.stocks || AVAILABLE_STOCKS;

  // Use myRooms passed from parent, calculate public rooms as all - mine
  const allPublicRooms = rooms.filter(
    (room) => !myRooms.find((myRoom) => myRoom.id === room.id)
  );

  // Filter rooms based on search query
  const filteredRooms = (
    activeRoomTab === "all" ? allPublicRooms : myRooms
  ).filter(
    (room) =>
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateRoom = () => {
    if (
      createFormData.name.trim() &&
      createFormData.symbol.trim() &&
      createFormData.timeDuration.trim() &&
      createFormData.minStake.trim()
    ) {
      onCreateRoom?.(createFormData);
      setCreateFormData({
        name: "",
        symbol: "",
        timeDuration: "",
        minStake: "",
      });
      setShowCreateDialog(false);
    }
  };

  const displayedRooms = filteredRooms;
  return (
    <main className="flex-1">
      {/* Header */}
      <header className="mb-4 border-b border-[#1E2943] p-4 py-2 flex justify-between items-center">
        <h2 className="text-lg font-semibold">ROOMS</h2>
        <div className="flex items-center w-full max-w-md">
          <div className="relative w-full">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
              aria-hidden
            />
            <Input
              placeholder="Search rooms or symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 w-full bg-[#0F1729] border-[#1E2943] text-white rounded-md transition focus:border-green-400 focus:ring-2 focus:ring-green-300/20"
              aria-label="Search rooms"
            />

            {/* Clear button */}
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-white"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content Area */}
      <ScrollArea className="p-4 pb-0 h-[calc(100vh-100px)]">
        <div className="w-full rounded shadow relative h-48 overflow-hidden mb-5 flex items-center justify-center">
          <Image
            src={"/images/banner.jpg"}
            alt="Banner"
            fill
          />
          <div className="bg-black/30 absolute inset-0 z-10"></div>
          <Logo className="relative z-20 inset-0" />
        </div>

        {/* Tab Section - All Rooms vs My Rooms with Create Button */}
        <div className="flex items-center gap-4 mb-6">
          {/* Tabs */}
          <div className="flex gap-2 bg-[#0F1729] rounded p-1 border border-[#1E2943]">
            <button
              onClick={() => setActiveRoomTab("all")}
              className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                activeRoomTab === "all"
                  ? "bg-green-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              All Active Rooms
            </button>
            <button
              onClick={() => setActiveRoomTab("created")}
              className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                activeRoomTab === "created"
                  ? "bg-green-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              My Rooms
            </button>
          </div>

          {/* Create Button */}
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 ml-auto bg-green-500 hover:bg-green-600 text-white font-semibold text-sm"
          >
            <Plus size={18} />
            Create Room
          </Button>
        </div>

        {/* Rooms List */}
        <div className="space-y-4">
          {isLoading ? (
            <LoadingRoomList count={3} />
          ) : displayedRooms.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">
                {searchQuery
                  ? "No rooms match your search"
                  : activeRoomTab === "all"
                  ? "No active rooms available"
                  : "You haven't created any rooms yet"}
              </p>
            </div>
          ) : (
            displayedRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                roomId={room.id}
                isOwned={activeRoomTab === "created"}
                onJoin={onJoinRoom}
                onViewDetails={onViewOwnedRoomDetails}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Create Room Dialog */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      >
        <DialogContent className="border-[#1E2943] bg-[#0F1729]">
          <DialogHeader>
            <DialogTitle className="text-white">Create a New Room</DialogTitle>
            <DialogDescription className="text-gray-400">
              Set up a new prediction room for trading a Nigerian stock
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-2">
                Room Name
              </label>
              <Input
                placeholder="e.g., MTN Bullish"
                value={createFormData.name}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, name: e.target.value })
                }
                className="bg-[#1E2943] border-[#1E2943] text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">
                Stock Symbol
              </label>
              <Select
                value={createFormData.symbol}
                onValueChange={(value: string) =>
                  setCreateFormData({
                    ...createFormData,
                    symbol: value,
                  })
                }
              >
                <SelectTrigger className="bg-[#1E2943] border-[#1E2943] text-white">
                  <SelectValue
                    placeholder={
                      loadingStocks ? "Loading stocks..." : "Select a stock..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {loadingStocks ? (
                    <div className="p-2 text-center text-sm text-gray-400">
                      Loading stocks...
                    </div>
                  ) : availableStocks.length === 0 ? (
                    <div className="p-2 text-center text-sm text-gray-400">
                      No stocks available
                    </div>
                  ) : (
                    availableStocks.map((stock: any) => (
                      <SelectItem
                        key={stock.symbol}
                        value={stock.symbol}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{stock.symbol}</span>
                          <span className="text-gray-400">- {stock.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">
                Prediction Duration
              </label>
              <Select
                value={createFormData.timeDuration}
                onValueChange={(value) =>
                  setCreateFormData({
                    ...createFormData,
                    timeDuration: value,
                  })
                }
              >
                <SelectTrigger className="bg-[#1E2943] border-[#1E2943] text-white">
                  <SelectValue placeholder="Select duration..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Hour (DEMO)</SelectItem>
                  <SelectItem value="1 week">1 Week</SelectItem>
                  <SelectItem value="2 weeks">2 Weeks</SelectItem>
                  <SelectItem value="1 month">1 Month</SelectItem>
                  <SelectItem value="2 months">2 Months</SelectItem>
                  <SelectItem value="3 months">3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">
                Minimum Stake (cUSD)
              </label>
              <Input
                type="number"
                placeholder="e.g., 100"
                value={createFormData.minStake}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    minStake: e.target.value,
                  })
                }
                className="bg-[#1E2943] border-[#1E2943] text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="border-[#1E2943] text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRoom}
              disabled={
                !createFormData.name.trim() ||
                !createFormData.symbol.trim() ||
                !createFormData.timeDuration.trim() ||
                !createFormData.minStake.trim()
              }
              className="bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
            >
              Create Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

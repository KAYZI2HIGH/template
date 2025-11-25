-- Migration: Add settlement fields to database
-- Purpose: Track settlement outcomes and payouts

-- Add outcome and payout columns to predictions table
alter table predictions 
add column outcome varchar(10) default null,
add column payout_amount decimal(18,8) default 0,
add column settled_at timestamp default null;

-- Add ending_price to rooms table (already might exist, but ensure it's there)
alter table rooms 
add column if not exists ending_price decimal(18,8) default null;

-- Create index for efficient settlement queries
create index idx_predictions_room_settled 
on predictions(room_id, outcome) 
where outcome is not null;

-- Create index for settlement history
create index idx_rooms_status_updated 
on rooms(status, updated_at);

-- Add comment for context
comment on column predictions.outcome is 'WIN or LOSS - set during room settlement';
comment on column predictions.payout_amount is 'Amount user won (0 if lost)';
comment on column predictions.settled_at is 'Timestamp when prediction was settled';
comment on column rooms.ending_price is 'Final price when room was settled';

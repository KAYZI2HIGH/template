-- Users table
CREATE TABLE users (
  wallet_address VARCHAR(42) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id_web VARCHAR(255) UNIQUE NOT NULL,
  creator_wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
  name VARCHAR(255) NOT NULL,
  ticker VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  maturity_time BIGINT NOT NULL,
  strike_price NUMERIC NOT NULL,
  blockchain_room_id BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Predictions table
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
  direction VARCHAR(10) NOT NULL,
  stake_amount NUMERIC NOT NULL,
  outcome VARCHAR(20) DEFAULT 'PENDING',
  payout_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  settled_at TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL REFERENCES users(wallet_address),
  access_token VARCHAR(500),
  refresh_token VARCHAR(500),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_rooms_creator ON rooms(creator_wallet_address);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_predictions_room ON predictions(room_id);
CREATE INDEX idx_predictions_user ON predictions(user_wallet_address);

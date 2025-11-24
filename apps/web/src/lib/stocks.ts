export interface Stock {
  symbol: string;
  name: string;
  currentPrice: string;
}

export const AVAILABLE_STOCKS: Stock[] = [
  { symbol: "MTN.NG", name: "MTN Nigeria", currentPrice: "₦250.50" },
  { symbol: "DANGOTE.NG", name: "Dangote Group", currentPrice: "₦1,250.00" },
  { symbol: "BUACEMENT.NG", name: "BUA Cement", currentPrice: "₦580.25" },
  { symbol: "AIRTELAFRI.NG", name: "Airtel Africa", currentPrice: "₦1,450.75" },
  { symbol: "ZENITHBANK.NG", name: "Zenith Bank", currentPrice: "₦32.40" },
  { symbol: "GTCO.NG", name: "Guaranty Trust Co.", currentPrice: "₦42.85" },
  { symbol: "SEPLAT.NG", name: "SEPLAT Energy", currentPrice: "₦785.30" },
  { symbol: "NESTLE.NG", name: "Nestle Nigeria", currentPrice: "₦890.00" },
];

export function getStockBySymbol(symbol: string): Stock | undefined {
  return AVAILABLE_STOCKS.find((stock) => stock.symbol === symbol);
}

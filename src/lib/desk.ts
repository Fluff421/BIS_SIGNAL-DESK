import snapshot from "@/data/snapshot.json";
import board from "@/data/board.json";
import ledger from "@/data/ledger.json";
import model from "@/data/model.json";

export type WatchRow = {
  league: string;
  kick: string;
  away: string;
  home: string;
  neutral: boolean;
  marketHome: number;
  modelHome: number;
  edgeTo: string;
  edge: number;
  total: number;
  note: string;
};
export type AlignedRow = {
  league: string;
  away: string;
  home: string;
  marketHome: number;
  modelHome: number;
  total: number;
  note?: string;
};

export const deskSnapshot = snapshot;
export const deskBoard = board as {
  issuedPlays: unknown[];
  watch: WatchRow[];
  aligned: AlignedRow[];
};
export const deskLedger = ledger;
export const deskModel = model;

export function fmtSpread(n: number) {
  if (n === 0) return "PK";
  return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1);
}

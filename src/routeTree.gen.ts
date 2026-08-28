/* eslint-disable */
// @ts-nocheck
// Generated route tree (simplified for initial push)
import { Route as rootRoute } from "./routes/__root";
import { Route as IndexRoute } from "./routes/index";
import { Route as BoardRoute } from "./routes/board";
import { Route as DigestRoute } from "./routes/digest";
import { Route as LedgerRoute } from "./routes/ledger";
import { Route as ModelRoute } from "./routes/model";

const IndexRouteWithChildren = IndexRoute;
const BoardRouteWithChildren = BoardRoute;
const DigestRouteWithChildren = DigestRoute;
const LedgerRouteWithChildren = LedgerRoute;
const ModelRouteWithChildren = ModelRoute;

export const routeTree = rootRoute.addChildren([
  IndexRouteWithChildren,
  BoardRouteWithChildren,
  DigestRouteWithChildren,
  LedgerRouteWithChildren,
  ModelRouteWithChildren,
]);

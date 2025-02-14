import { type RouteConfig, index, route, } from "@react-router/dev/routes";

export default [
    index("routes/Index.tsx"),
    route("*?", "routes/NotFound.tsx"),
] satisfies RouteConfig;

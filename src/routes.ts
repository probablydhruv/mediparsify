import { type RouteConfig, index, layout, route, } from "@react-router/dev/routes";

export default [
    layout("routes/layout.tsx", [
        index("routes/Index.tsx"),
        route("/about", "routes/About.tsx"),
        route("/app", "routes/Main.tsx"),
        route("*?", "routes/NotFound.tsx"),
    ]),
] satisfies RouteConfig;

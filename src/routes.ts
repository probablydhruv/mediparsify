import {
    type RouteConfig,
    route,
    index
} from "@react-router/dev/routes";

export default [
    index("pages/Index.tsx"),
    route("test/:id", "pages/Test.tsx"),
    route("*", "pages/NotFound.tsx"),
] satisfies RouteConfig;

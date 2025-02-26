// Desc: 404 Page Not Found component

import { Link } from "react-router";

export default function Component() {

    return (
        <>
            <h1 className="text-3xl font-bold text-center">404 - Page Not Found</h1>
            <p className="text-center">The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                <br />
                <span className="underline"><Link to="/">Redirect to Home page</Link> </span>
            </p>
        </>
    );
};

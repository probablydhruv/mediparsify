// Desc: 404 Page Not Found component

import { Link } from "react-router";

export default function Component() {

    return (
        <div className="min-h-screen bg-white p-4 md:p-8">
            <h1 className="text-3xl font-bold text-center">404 - Page Not Found</h1>
            <p className="text-center">The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                <p className="underline">Redirect to <Link to="/">Home page</Link> </p>
            </p>
        </div>
    );
};


export async function loader({ params }) {
    return { id: params }

}

export default function Component({
    params,
}: Route.ComponentProps) {

    return (
        <div className="min-h-screen bg-white p-4 md:p-8">
            asdasd
        </div>
    );
};

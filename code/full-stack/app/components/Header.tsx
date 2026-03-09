import Link from "next/link";

export default function Header()
{
    return(
        <header className="bg-white border-b border-grey-300">
            <div className="max-w-7x1 mx-auto flex items-center justify-between p-4">
                <Link href="/" className="font-semibold hover:text-gray-300">
                    Home
                </Link>
                <nav className="flex gap-6">
                    <Link href="/" className="hover:text-gray-300">
                        Assets
                    </Link>

                    <Link href="/inbox" className="hover:text-gray-300">
                        Inbox
                    </Link>
                </nav>
            </div>
        </header>
    );
}
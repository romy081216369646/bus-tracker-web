import { Link } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export default async function ProfilePage() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("better-auth.session_token")?.value;
    
    let session = null;
    if (sessionToken) {
        session = await auth.api.getSession({
            headers: { cookie: `better-auth.session_token=${sessionToken}` },
        });
    }
    
    if (!session?.user?.id) {
        return (
            <div className="min-h-screen bg-[#e8ebf6] flex items-center justify-center p-6">
                <p className="text-[#596072]">Please log in to view your profile.</p>
            </div>
        );
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            name: true,
            email: true,
            image: true,
            role: true,
        },
    });

    if (!user) {
        return (
            <div className="min-h-screen bg-[#e8ebf6] flex items-center justify-center p-6">
                <p className="text-[#596072]">User not found.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#e8ebf6] flex items-center justify-center p-6">
            <div className="bg-white shadow-2xl shadow-[#0f2c66]/10 rounded-2xl p-12 w-full max-w-md">
                
                {/* Foto Profile */}
                <div className="flex flex-col items-center">
                    {user.image ? (
                        <img
                            src={user.image}
                            alt="Profile"
                            className="w-28 h-28 rounded-full border-4 border-[#0c49a6] shadow-md"
                        />
                    ) : (
                        <div className="w-28 h-28 rounded-full border-4 border-[#0c49a6] shadow-md bg-[#e4eafc] flex items-center justify-center">
                            <span className="text-3xl font-bold text-[#0c49a6]">
                                {user.name?.charAt(0)?.toUpperCase() ?? "?"}
                            </span>
                        </div>
                    )}

                    <h1 className="mt-4 text-2xl font-bold text-[#1f2637]">
                        {user.name}
                    </h1>

                    <p className="text-[#6a7182]">
                        {user.email}
                    </p>
                </div>

                {/* Informasi */}
                <div className="mt-8 space-y-4">

                    <div className="bg-[#e4eafc] p-4 rounded-xl">
                        <p className="text-sm text-[#596072]">Role</p>
                        <p className="font-bold text-[#1f2637] capitalize">
                            {user.role || "user"}
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
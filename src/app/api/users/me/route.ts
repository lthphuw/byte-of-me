import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

// GET: Fetch the current user
export async function GET() {
    try {
        // Replace with auth-based user fetching (e.g., NextAuth.js session)
        const email = "lthphuw@gmail.com" // Hardcoded for demo

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                birthdate: true,
                tagLine: true,
                email: true,
                phoneNumber: true,
                linkedIn: true,
                facebook: true,
                github: true,
                leetCode: true,
                twitter: true,
                portfolio: true,
                stackOverflow: true,
                image: true,
                imageCaption: true,
                quote: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Convert Date objects to ISO strings for JSON serialization
        const serializedUser = {
            ...user,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        }

        return NextResponse.json(serializedUser)
    } catch (error) {
        console.error("Error fetching user:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    } finally {
        await prisma.$disconnect()
    }
}
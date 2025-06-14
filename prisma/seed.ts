import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("Seeding database...")

    // Clear existing users (optional, for idempotency)
    await prisma.user.deleteMany()

    // Seed users
    await prisma.user.createMany({
        data: [
            {
                name: "Luong Thanh Phu Hoang",
                firstName: "Phu",
                lastName: "Luong Thanh Hoang",
                birthdate: "2002-11-20",
                tagLine: " Code, career, controller — one byte at a time.",
                email: "lthphuw@gmail.com",
                image: "/images/avatars/HaNoi2024.jpeg",
                imageCaption: "Taken at the Vietnam Military History Museum, this 2024 painting is titled “Sống bám đá, chết hoá đá” — “Cling to rocks in life, turn to stone in death.”",
                quote: `
                I enjoy learning new things and have a strong interest in open - source projects, where I often discover useful ideas and best practices.These experiences help me build better and more efficient solutions. 
                For me, growth doesn’t just come from work—it also comes from self - exploration and continuous learning.That’s what truly drives my development.`,
                linkedIn: "www.linkedin.com/in/phu-lth",
                github: "https://github.com/lthphuw"
            },
        ],
    })

    console.log("Seeding completed!")
}

main()
    .catch((e) => {
        console.error("Error seeding database:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

import { MiniGalleryStack } from "@/components/mini-galary";
import { AboutShell } from "@/components/shell";

export default function AboutPage() {
    const images = [
        {
            src: "/images/about/image1.jpeg",
            alt: "",
        },
        {
            src: "/images/about/image2.jpeg",
            alt: "",
        },
        {
            src: "/images/about/image3.jpeg",
            alt: "",
        },
    ];
    return (
        <AboutShell>
            <MiniGalleryStack images={images} />
        </AboutShell>
    )
}

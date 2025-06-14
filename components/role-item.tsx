import { cn } from "@/lib/utils";

export interface Role {
    title: string;
    from: string;
    to: string;
    duration: string;
    location: string;
    type: string;
    isHighlighted?: boolean;
    isFirst?: boolean; // injected internally
}

export default function RoleItem({
    title,
    from,
    to,
    duration,
    location,
    type,
    isHighlighted,
    isFirst,
}: Role) {
    return (
        <div
            className={cn(
                "border-l-2 pl-3",
                isFirst ? "border-green-500" : "border-gray-300",
                !isHighlighted ? "opacity-70" : ""
            )}
        >
            <h4 className="font-semibold">
                {title}{" "}
                {isHighlighted && <span className="text-green-500">✔</span>}
            </h4>
            <p className="text-sm text-gray-500">
                {from} - {to} ({duration}) • {location} • {type}
            </p>
        </div>
    );
}

import RoleItem, { Role } from "./role-item";

export interface CompanyExperienceData {
    company: string;
    logoUrl: string;
    roles: Role[];
}

export default function CompanyExperience({
    company,
    logoUrl,
    roles,
}: CompanyExperienceData) {
    return (
        <div className="flex">
            {/* Logo + line */}
            <div className="mr-4 flex flex-col items-center">
                <img src={logoUrl} alt={company} className="size-8 rounded-full" />
                <div className="mt-1 w-px flex-1 bg-gray-300" />
            </div>

            {/* Content */}
            <div className="flex-1">
                <h3 className="text-lg font-semibold">{company}</h3>
                <div className="mt-2 space-y-2">
                    {roles.map((role, idx) => (
                        <RoleItem key={idx} {...role} isFirst={idx === 0} />
                    ))}
                </div>
            </div>
        </div>
    );
}

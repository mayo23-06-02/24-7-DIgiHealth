import React from "react";
import { BiMapPin, BiStar, BiChevronRight } from "react-icons/bi";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";

interface EntityData {
  id: string;
  name: string;
  subtitle: string;
  image?: string;
  rating?: number;
  reviewsCount?: number;
  location: string;
  tags?: string[];
  status?: "online" | "offline" | "busy" | "none";
  type: "practitioner" | "facility";
}

interface EntityCardProps {
  data: EntityData;
  onClick: (data: EntityData) => void;
  actionLabel?: string;
}

const EntityCard: React.FC<EntityCardProps> = ({
  data,
  onClick,
  actionLabel = "View Profile",
}) => {
  return (
    <Card
      variant="solid"
      noPadding
      className="group cursor-pointer hover: hover:shadow-primary/5 border-transparent hover:border-primary/10 transition-all duration-500"
    >
      <div onClick={() => onClick(data)}>
        {/* Cover Image/Header */}
        <div className="relative h-32 bg-linear-to-br from-slate-100 to-slate-200">
          {data.image && (
            <img
              src={data.image}
              alt={data.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
          )}
          <div className="absolute inset-0 bg-slate-900/10" />

          <div className="absolute top-4 left-4">
            <Badge
              label={data.type === "practitioner" ? "Specialist" : "Facility"}
              status="premium"
              variant="solid"
            />
          </div>
        </div>

        <div className="p-6 relative">
          {/* Avatar floating */}
          {data.type === "practitioner" && (
            <div className="absolute -top-8 right-6">
              <Avatar
                src={data.image}
                name={data.name}
                size="lg"
                status={data.status}
                className="ring-4 ring-white"
              />
            </div>
          )}

          <div className="space-y-1 mb-4">
            <div className="flex items-center gap-2">
              <h4 className="text-xl font-medium text-slate-900 tracking-tight">
                {data.name}
              </h4>
              {data.rating && (
                <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                  <BiStar />
                  {data.rating}
                </div>
              )}
            </div>
            <p className="text-xs text-primary uppercase tracking-normal">
              {data.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-6">
            <BiMapPin className="text-primary" />
            {data.location}
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {data.tags?.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded bg-slate-50 text-slate-400 text-[9px] font-bold uppercase tracking-normal"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-normal">
              {actionLabel}
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-primary group-hover:text-white flex items-center justify-center text-slate-400 transition-all">
              <BiChevronRight size={20} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default EntityCard;

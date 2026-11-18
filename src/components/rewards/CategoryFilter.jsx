import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CategoryFilter({ value, onChange }) {
  const { data: categories = [] } = useQuery({
    queryKey: ["rewardCategories"],
    queryFn: () => base44.entities.RewardCategory.list("-created_date")
  });

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40 bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Categories</SelectItem>
        {categories.map(cat => (
          <SelectItem key={cat.id} value={cat.name}>
            {cat.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
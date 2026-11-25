// Tremor Raw Tooltip (Radix).
import * as TooltipPrimitives from "@radix-ui/react-tooltip";
import { Tooltip } from "@/components/tremor/Tooltip";

const TooltipProvider = ({ delayDuration = 150, ...props }: React.ComponentProps<typeof TooltipPrimitives.Provider>) => <TooltipPrimitives.Provider delayDuration={delayDuration} {...props} />;

export { Tooltip, TooltipProvider };

import { Check, Upload, Scan, Table, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  title: string;
  description: string;
  icon: typeof Upload;
}

const steps: Step[] = [
  { id: 1, title: "Upload", description: "Add images", icon: Upload },
  { id: 2, title: "OCR", description: "Extract text", icon: Scan },
  { id: 3, title: "Review", description: "Edit data", icon: Table },
  { id: 4, title: "Export", description: "Generate XML", icon: FileCode },
];

interface ProgressStepperProps {
  currentStep: number;
  completedSteps: number[];
}

export function ProgressStepper({ currentStep, completedSteps }: ProgressStepperProps) {
  return (
    <nav aria-label="Progress" className="w-full" data-testid="progress-stepper">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isUpcoming = !isCompleted && !isCurrent;

          return (
            <li key={step.id} className="flex-1 relative">
              <div className="flex flex-col items-center">
                {index > 0 && (
                  <div
                    className={cn(
                      "absolute top-5 -left-1/2 w-full h-0.5 -z-10",
                      isCompleted || isCurrent ? "bg-primary" : "bg-muted"
                    )}
                    aria-hidden="true"
                  />
                )}
                
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary bg-background text-primary",
                    isUpcoming && "border-muted bg-muted/50 text-muted-foreground"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                  data-testid={`step-indicator-${step.id}`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <step.icon className="w-5 h-5" aria-hidden="true" />
                  )}
                </div>

                <div className="mt-2 text-center">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isCurrent && "text-foreground",
                      isCompleted && "text-primary",
                      isUpcoming && "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

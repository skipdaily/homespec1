import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mascot } from "./Mascot";
import { useTutorial } from "./TutorialContext";

export const TutorialStep = () => {
  const { isActive, currentStep, steps, nextStep, previousStep, endTutorial } = useTutorial();

  if (!isActive) return null;

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 bg-black/20 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className={`fixed ${step.position === 'bottom-right' ? 'bottom-32 right-4' : 
                            step.position === 'bottom-left' ? 'bottom-32 left-4' : 
                            step.position === 'top-right' ? 'top-4 right-4' : 
                            'top-4 left-4'} 
                    z-50 pointer-events-auto`}
        >
          <Card className="p-6 w-[320px] space-y-4">
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
            <div className="flex justify-between">
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousStep}
                  disabled={currentStep === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextStep}
                >
                  {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={endTutorial}
              >
                Skip
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
      <Mascot position={step.position} />
    </AnimatePresence>
  );
};

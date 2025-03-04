import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  targetElement?: string;
}

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  startTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  endTutorial: () => void;
}

const defaultSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to HomeSpec! 👋',
    description: "I'm Homey, your friendly guide! I'll help you learn how to document and manage your home items.",
    position: 'bottom-right'
  },
  {
    id: 'add-item',
    title: 'Adding Items',
    description: 'Click the "Add Item" button to start documenting your home items. You can add details like brand, cost, and warranty information.',
    position: 'top-right',
    targetElement: '[data-tutorial="add-item"]'
  },
  {
    id: 'item-history',
    title: 'Item History',
    description: 'Track changes to your items over time. The history feature helps you maintain a record of updates and modifications.',
    position: 'bottom-left',
    targetElement: '[data-tutorial="item-history"]'
  }
];

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps] = useState(defaultSteps);

  useEffect(() => {
    // Check if this is the user's first visit
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      setIsActive(true);
      localStorage.setItem('hasSeenTutorial', 'true');
    }
  }, []);

  const startTutorial = () => {
    setIsActive(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endTutorial();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const endTutorial = () => {
    setIsActive(false);
    setCurrentStep(0);
  };

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        steps,
        startTutorial,
        nextStep,
        previousStep,
        endTutorial
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

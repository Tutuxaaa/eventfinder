import { useState } from "react";
import { Button } from "./ui/button";
import { Camera, Search, Heart, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Camera,
    title: "Сфотографируй афишу",
    description: "Увидели интересную афишу? Сделайте фото, и мы найдём все детали события",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: Search,
    title: "Находи события моментально",
    description: "Наша технология распознает текст и изображения, чтобы найти точное событие",
    gradient: "from-purple-500 to-indigo-600",
  },
  {
    icon: Heart,
    title: "Сохраняй любимое",
    description: "Добавляйте события в избранное и получайте уведомления о важных изменениях",
    gradient: "from-indigo-500 to-blue-600",
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const skip = () => {
    onComplete();
  };

  const CurrentIcon = slides[currentSlide].icon;

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-background p-6 pb-12">
      <div className="flex w-full justify-end">
        <Button variant="ghost" onClick={skip} className="text-muted-foreground hover:text-foreground">
          Пропустить
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <div className={`mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br ${slides[currentSlide].gradient}`}>
              <CurrentIcon className="h-16 w-16 text-white" />
            </div>
            
            <h2 className="mb-4 max-w-md text-foreground">{slides[currentSlide].title}</h2>
            <p className="max-w-sm text-muted-foreground">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 flex gap-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      <Button
        onClick={nextSlide}
        size="lg"
        className="w-full max-w-sm bg-primary hover:bg-primary/90"
      >
        {currentSlide < slides.length - 1 ? "Далее" : "Начать"}
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}

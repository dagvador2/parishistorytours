import React, { useState } from "react";
import { BookingProvider, useBooking } from "./BookingContext";
import ProgressIndicator from "./components/ProgressIndicator";
import StepWrapper from "./components/StepWrapper";
import Step1TourSetup from "./steps/Step1TourSetup";
import Step2DateRegular from "./steps/Step2DateRegular";
import Step2DatePrivate from "./steps/Step2DatePrivate";
import Step3Checkout from "./steps/Step3Checkout";

const Wizard: React.FC = () => {
  const { booking, t } = useBooking();
  const [step, setStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const next = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setIsTransitioning(false);
    }, 300);
  };

  const back = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep((s) => Math.max(1, s - 1));
      setIsTransitioning(false);
    }, 300);
  };

  const renderStep = () => {
    const stepProps = {
      isTransitioning,
      onNext: step < 3 ? next : undefined,
      onBack: step > 1 ? back : undefined,
    };

    switch (step) {
      case 1:
        return (
          <StepWrapper
            {...stepProps}
            nextLabel={t.next}
            showBack={false}
            validationKey="tourSetup"
            validationMessage={t.validation.completeTourSetup}
          >
            <Step1TourSetup />
          </StepWrapper>
        );
      case 2:
        return booking.tourType === "regular" ? (
          <StepWrapper
            {...stepProps}
            nextLabel={t.next}
            validationKey="dateTime"
            validationMessage={t.validation.chooseSession}
          >
            <Step2DateRegular />
          </StepWrapper>
        ) : (
          <StepWrapper
            {...stepProps}
            nextLabel={t.next}
            validationKey="dateTime"
            validationMessage={t.validation.chooseSession}
          >
            <Step2DatePrivate />
          </StepWrapper>
        );
      case 3:
        return (
          <Step3Checkout
            onBack={back}
            onRestart={() => setStep(1)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800">
        {t.title}
      </h2>
      <p className="text-center text-gray-600 mb-12 text-lg">
        {t.subtitle}
      </p>

      <ProgressIndicator currentStep={step} />

      <div className="min-h-[400px] mt-8">{renderStep()}</div>
    </div>
  );
};

interface BookingWizardProps {
  translations: Record<string, any>;
  lang: string;
  defaultTour?: string;
}

const BookingWizard: React.FC<BookingWizardProps> = ({ translations, lang, defaultTour }) => {
  return (
    <BookingProvider translations={translations} lang={lang} defaultTour={defaultTour}>
      <Wizard />
    </BookingProvider>
  );
};

export default BookingWizard;

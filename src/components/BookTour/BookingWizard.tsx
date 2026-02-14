import React, { useState } from "react";
import { BookingProvider, useBooking } from "./BookingContext";
import ProgressIndicator from "./components/ProgressIndicator";
import StepWrapper from "./components/StepWrapper";
import StepTourSelection from "./steps/StepTourSelection";
import StepParticipants from "./steps/StepParticipants";
import StepTourType from "./steps/StepTourType";
import StepCalendarRegular from "./steps/StepCalendarRegular";
import StepDateTimePrivate from "./steps/StepDateTimePrivate";
import StepContact from "./steps/StepContact";
import StepSummary from "./steps/StepSummary";

const Wizard: React.FC = () => {
  const { t } = useBooking();
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
      onNext: step < 6 ? next : undefined,
      onBack: step > 1 ? back : undefined,
    };

    switch (step) {
      case 1:
        return (
          <StepWrapper
            {...stepProps}
            nextLabel={t.next}
            showBack={false}
            validationKey="tour"
            validationMessage={t.validation.selectTour}
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-6">
              {t.step1}
            </h3>
            <StepTourSelection />
          </StepWrapper>
        );
      case 2:
        return (
          <StepWrapper
            {...stepProps}
            nextLabel={t.next}
            validationKey="participants"
            validationMessage={t.validation.selectParticipants}
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-6">
              {t.step2}
            </h3>
            <StepParticipants />
          </StepWrapper>
        );
      case 3:
        return (
          <StepWrapper
            {...stepProps}
            nextLabel={t.next}
            validationKey="tourType"
            validationMessage={t.validation.selectType}
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-6">
              {t.step3}
            </h3>
            <StepTourType />
          </StepWrapper>
        );
      case 4:
        return (
          <StepWrapper
            {...stepProps}
            nextLabel={t.next}
            validationKey="dateTime"
            validationMessage={t.validation.chooseSession}
          >
            <StepCalendarRegular active={true} />
            <StepDateTimePrivate active={true} />
          </StepWrapper>
        );
      case 5:
        return (
          <StepWrapper
            {...stepProps}
            nextLabel={t.next}
            validationKey="contact"
            validationMessage={t.validation.fillContact}
          >
            <StepContact />
          </StepWrapper>
        );
      case 6:
        return (
          <StepWrapper {...stepProps} showBack={false}>
            <StepSummary onEditDetails={() => setStep(5)} onRestart={() => setStep(1)} />
          </StepWrapper>
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
}

const BookingWizard: React.FC<BookingWizardProps> = ({ translations, lang }) => {
  return (
    <BookingProvider translations={translations} lang={lang}>
      <Wizard />
    </BookingProvider>
  );
};

export default BookingWizard;

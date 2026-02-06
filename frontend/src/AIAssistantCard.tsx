import React from "react";
import styled from "styled-components";
import type { Schema } from "./types";
import type { AIQuestionResult } from "./api";
import { theme } from "./theme";

const Card = styled.div`
  background: ${theme.surface};
  border-radius: 12px;
  border: 1px solid ${theme.border};
  padding: 1.5rem 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  overflow-x: auto;
  overflow-y: visible;
  min-width: 0;
  position: relative;
  border-left: 3px solid ${theme.ai};
`;

const Title = styled.h2`
  font-family: "Outfit", "DM Sans", sans-serif;
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  color: ${theme.text};
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Badge = styled.span`
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  background: ${theme.aiLight};
  color: ${theme.aiHover};
  letter-spacing: 0.02em;
`;

const SectionTitle = styled.h3`
  font-family: "Outfit", "DM Sans", sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  margin: 1.25rem 0 0.35rem 0;
  color: ${theme.textSecondary};
  letter-spacing: 0.02em;
  text-transform: uppercase;
  &:first-of-type { margin-top: 0.5rem; }
`;

const Hint = styled.p`
  font-size: 0.75rem;
  color: ${theme.textSecondary};
  margin: 0.2rem 0 0.5rem 0;
  line-height: 1.45;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 2.5rem;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  border: 1px solid ${theme.borderStrong};
  background: ${theme.surface};
  color: ${theme.text};
  font-size: 0.85rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:focus { outline: none; border-color: ${theme.ai}; box-shadow: 0 0 0 2px ${theme.aiPale}; }
  &::placeholder { color: ${theme.textMuted}; }
`;

const TextAreaTall = styled(TextArea)`
  min-height: 4rem;
`;

const ButtonPrimary = styled.button`
  width: 100%;
  padding: 0.6rem 0.9rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  margin-top: 0.5rem;
  border: none;
  background: ${theme.ai};
  color: ${theme.textInverse};
  transition: background 0.15s, box-shadow 0.15s;
  &:hover:not(:disabled) { background: ${theme.aiHover}; box-shadow: 0 2px 8px rgba(109, 40, 217, 0.35); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ButtonSecondary = styled.button`
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid ${theme.primary};
  background: transparent;
  color: ${theme.primary};
  transition: background 0.15s, color 0.15s;
  &:hover:not(:disabled) { background: ${theme.primaryLight}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ButtonGhost = styled.button`
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid ${theme.borderStrong};
  background: transparent;
  color: ${theme.textSecondary};
  &:hover { background: ${theme.pageBg}; border-color: ${theme.textMuted}; }
`;

const Section = styled.div`
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid ${theme.borderMuted};
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.5rem 0 0.5rem 0;
`;

const Chip = styled.button`
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid ${theme.border};
  background: ${theme.surfaceAlt};
  color: ${theme.textSecondary};
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  &:hover { background: ${theme.aiLight}; border-color: #c4b5fd; color: ${theme.aiHover}; }
`;

const InsightBox = styled.div`
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, ${theme.aiPale} 0%, ${theme.aiLight} 100%);
  border: 1px solid #c4b5fd;
  border-radius: 10px;
  font-size: 0.9rem;
  line-height: 1.55;
  color: ${theme.text};
  max-height: 18vh;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  & strong { color: ${theme.aiHover}; }
`;

const PatchCard = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  background: ${theme.primaryPale};
  border: 1px solid ${theme.primaryBorder};
  border-radius: 8px;
`;

const PatchTitle = styled.p`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${theme.primary};
  margin: 0 0 0.5rem 0;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
`;

const SuccessBanner = styled.div`
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: ${theme.successBg};
  border: 1px solid ${theme.successBorder};
  border-radius: 8px;
  font-size: 0.85rem;
  color: ${theme.successText};
`;

const ErrorText = styled.p`
  font-size: 0.75rem;
  color: ${theme.errorText};
  margin: 0.35rem 0 0 0;
`;

const Spinner = styled.span`
  display: inline-block;
  width: 0.9em;
  height: 0.9em;
  border: 2px solid ${theme.aiLight};
  border-top-color: ${theme.ai};
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: -0.15em;
  margin-right: 0.35rem;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const CEO_QUICK_PROMPTS = [
  "How does backlash affect contracts?",
  "What drives reputation over time?",
  "Impact of visibility on regulation?",
  "How do we balance investment vs risk?",
];

export interface AIAssistantCardProps {
  /** Show CEO question section (when a schema is loaded in schema view). */
  showCeoSection: boolean;
  schema: Schema | null;
  // CEO question
  ceoQuestion: string;
  setCeoQuestion: (v: string) => void;
  ceoQuestionBusy: boolean;
  ceoQuestionError: string | null;
  ceoQuestionResult: AIQuestionResult | null;
  onAskQuestion: () => void;
  onApplySuggestedPatch: () => void;
  onDismissPatch: () => void;
  ceoAppliedMessage: string | null;
}

export function AIAssistantCard(props: AIAssistantCardProps) {
  const {
    showCeoSection,
    schema,
    ceoQuestion,
    setCeoQuestion,
    ceoQuestionBusy,
    ceoQuestionError,
    ceoQuestionResult,
    onAskQuestion,
    onApplySuggestedPatch,
    onDismissPatch,
    ceoAppliedMessage,
  } = props;

  return (
    <Card>
      <Title>
        AI assistant
        <Badge>LLM</Badge>
      </Title>
      <Hint style={{ marginBottom: "0.75rem" }}>
        Ask a question about this model. You get an insight and, when relevant, an optional schema addition. Apply the suggestion to see it in the diagram—new parts appear in purple.
      </Hint>

      {showCeoSection && schema && (
        <>
          <SectionTitle>Ask a question (CEO)</SectionTitle>
          <Hint>Plain-language question about this model. You get an insight and, when relevant, an optional schema addition. Apply the suggestion to see it in the diagram.</Hint>
          {ceoAppliedMessage && (
            <SuccessBanner>{ceoAppliedMessage}</SuccessBanner>
          )}
          <ChipRow>
            {CEO_QUICK_PROMPTS.map((q) => (
              <Chip
                key={q}
                type="button"
                onClick={() => {
                  setCeoQuestion(q);
                }}
              >
                {q}
              </Chip>
            ))}
          </ChipRow>
          <TextArea
            value={ceoQuestion}
            onChange={(e) => setCeoQuestion(e.target.value)}
            placeholder="e.g. What happens to our contracts if we reduce visibility? How does backlash affect reputation?"
            style={{ minHeight: "2.5rem" }}
          />
          <ButtonPrimary
            onClick={onAskQuestion}
            disabled={ceoQuestionBusy || !ceoQuestion.trim()}
          >
            {ceoQuestionBusy && <Spinner />}
            {ceoQuestionBusy ? "Getting insight…" : "Get insight"}
          </ButtonPrimary>
          {ceoQuestionError && <ErrorText>{ceoQuestionError}</ErrorText>}
          {ceoQuestionResult && (
            <div style={{ marginTop: "1rem" }}>
              <InsightBox>
                <strong>Insight:</strong> {ceoQuestionResult.interpretation}
              </InsightBox>
              {ceoQuestionResult.suggested_patch && (
                <PatchCard>
                  <PatchTitle>Suggested addition to the model</PatchTitle>
                  <ButtonRow>
                    <ButtonSecondary onClick={onApplySuggestedPatch}>
                      Apply to schema
                    </ButtonSecondary>
                    <ButtonGhost type="button" onClick={onDismissPatch}>
                      Dismiss
                    </ButtonGhost>
                  </ButtonRow>
                </PatchCard>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

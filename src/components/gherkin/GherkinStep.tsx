import {
  DataTable,
  DocString,
  getWorstTestStepResult,
  PickleDocString,
  PickleStep,
  PickleTable,
  Step,
} from '@cucumber/messages'
import React from 'react'

import CucumberQueryContext from '../../CucumberQueryContext.js'
import GherkinQueryContext from '../../GherkinQueryContext.js'
import { HighLight } from '../app/HighLight.js'
import { DefaultComponent, GherkinStepProps, useCustomRendering } from '../customise/index.js'
import { TestStepResultDetails } from '../results/index.js'
import { Attachment } from './attachment/index.js'
import { DataTable as DataTableComponent } from './DataTable.js'
import { DocString as DocStringComponent } from './DocString.js'
import { Keyword } from './Keyword.js'
import { Parameter } from './Parameter.js'
import { StepItem } from './StepItem.js'
import { Title } from './Title.js'

interface RenderableStep {
  id: string
  keyword: string
  text: string
  dataTable?: DataTable | PickleTable
  docString?: DocString | PickleDocString
}

function resolveStep(gherkinStep: Step, pickleStep?: PickleStep): RenderableStep {
  const step: RenderableStep = { ...gherkinStep }
  if (pickleStep) {
    step.text = pickleStep.text
    step.dataTable = pickleStep.argument?.dataTable
    step.docString = pickleStep.argument?.docString
  }
  return step
}

const DefaultRenderer: DefaultComponent<GherkinStepProps> = ({
  step: gherkinStep,
  pickleStep,
  hasExamples,
}) => {
  const step = resolveStep(gherkinStep, pickleStep)

  const gherkinQuery = React.useContext(GherkinQueryContext)
  const cucumberQuery = React.useContext(CucumberQueryContext)

  const pickleStepIds = pickleStep ? [pickleStep.id] : gherkinQuery.getPickleStepIds(step.id)
  const pickleStepTestStepResults = cucumberQuery.getPickleStepTestStepResults(pickleStepIds)
  const testStepResult = getWorstTestStepResult(pickleStepTestStepResults)
  const attachments = cucumberQuery.getPickleStepAttachments(pickleStepIds)

  const stepTextElements: JSX.Element[] = []

  if (!hasExamples) {
    const stepMatchArgumentsLists =
      pickleStepIds.length === 0
        ? // This can happen in rare cases for background steps in a document that only has step-less scenarios,
          // because background steps are not added to the pickle when the scenario has no steps. In this case
          // the background step will be rendered as undefined (even if there are matching step definitions). This
          // is not ideal, but it is rare enough that we don't care about it for now.
          []
        : cucumberQuery.getStepMatchArgumentsLists(pickleStepIds[0]) || []
    if (stepMatchArgumentsLists.length === 1) {
      // Step is defined
      const stepMatchArguments = stepMatchArgumentsLists[0].stepMatchArguments
      let offset = 0
      let plain: string
      stepMatchArguments.forEach((argument, index) => {
        plain = step.text.slice(offset, argument.group.start)
        if (plain.length > 0) {
          stepTextElements.push(<HighLight key={`plain-${index}`} text={plain} />)
        }
        const arg = argument.group.value
        if (arg !== undefined && arg !== null) {
          if (arg.length > 0) {
            stepTextElements.push(
              <Parameter
                parameterTypeName={argument.parameterTypeName || 'anonymous'}
                value={arg}
                key={`param-${index}`}
              >
                <HighLight text={arg} />
              </Parameter>
            )
          }
          offset += plain.length + arg.length
        }
      })
      plain = step.text.slice(offset)
      if (plain.length > 0) {
        stepTextElements.push(<HighLight key={`plain-rest`} text={plain} />)
      }
    } else if (stepMatchArgumentsLists.length >= 2) {
      // Step is ambiguous
      stepTextElements.push(<HighLight key={`plain-ambiguous`} text={step.text} />)
    } else {
      // Step is undefined
      stepTextElements.push(<HighLight key={`plain-undefined`} text={step.text} />)
    }
  } else {
    // Step is from scenario with examples, and has <> placeholders.
    stepTextElements.push(<HighLight key={`plain-placeholders`} text={step.text} />)
  }

  return (
    <StepItem status={testStepResult.status}>
      <Title header="h3" id={step.id}>
        <Keyword>{step.keyword.trim()}</Keyword>
        <span>{stepTextElements}</span>
      </Title>
      {step.dataTable && <DataTableComponent dataTable={step.dataTable} />}
      {step.docString && <DocStringComponent docString={step.docString} />}
      {!hasExamples && <TestStepResultDetails {...testStepResult} />}
      {!hasExamples &&
        attachments.map((attachment, i) => <Attachment key={i} attachment={attachment} />)}
    </StepItem>
  )
}

export const GherkinStep: React.FunctionComponent<GherkinStepProps> = (props) => {
  const ResolvedRenderer = useCustomRendering<GherkinStepProps>('GherkinStep', {}, DefaultRenderer)
  return <ResolvedRenderer {...props} />
}

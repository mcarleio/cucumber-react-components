import { TestStepResultStatus, TimeConversion } from '@cucumber/messages'
import { render } from '@testing-library/react'
import { expect } from 'chai'
import { add, addMilliseconds } from 'date-fns'
import React from 'react'

import { makeEmptyScenarioCountsByStatus } from '../../countScenariosByStatuses.js'
import { ExecutionSummary, IExecutionSummaryProps } from './ExecutionSummary.js'

const startDate = new Date(1639753096000)
const finishDate = new Date(1639753197000)

const scenarioCountByStatus = {
  ...makeEmptyScenarioCountsByStatus(),
  ...{
    [TestStepResultStatus.PASSED]: 100,
    [TestStepResultStatus.FAILED]: 3,
    [TestStepResultStatus.UNDEFINED]: 1,
  },
}

const DEFAULT_PROPS: IExecutionSummaryProps = {
  scenarioCountByStatus,
  totalScenarioCount: 104,
  testRunStarted: {
    timestamp: TimeConversion.millisecondsSinceEpochToTimestamp(startDate.getTime()),
  },
  testRunFinished: {
    timestamp: TimeConversion.millisecondsSinceEpochToTimestamp(finishDate.getTime()),
    success: false,
  },
  meta: {
    protocolVersion: '17.1.1',
    implementation: { version: '8.0.0-rc.1', name: 'cucumber-js' },
    cpu: { name: 'x64' },
    os: { name: 'linux', version: '5.11.0-1022-azure' },
    runtime: { name: 'node.js', version: '16.13.1' },
    ci: {
      name: 'GitHub Actions',
      url: 'https://github.com/cucumber/cucumber-js/actions/runs/1592557391',
      buildNumber: '1592557391',
      git: {
        revision: 'b53d820504b31c8e4d44234dc5eaa58d6b7fdd4c',
        remote: 'https://github.com/cucumber/cucumber-js.git',
        branch: 'main',
      },
    },
  },
}

describe('ExecutionSummary', () => {
  describe('last run date/time', () => {
    const examples: [text: string, referenceDate: Date][] = [
      ['1 hour ago', add(startDate, { hours: 1 })],
      ['3 hours ago', add(startDate, { hours: 3, minutes: 24, seconds: 18 })],
      ['1 day ago', add(startDate, { days: 1, hours: 3, minutes: 24, seconds: 18 })],
      ['15 days ago', add(startDate, { weeks: 2, days: 1 })],
    ]

    for (const [text, referenceDate] of examples) {
      it(`should render correctly for ${text}`, () => {
        const { getByText } = render(
          <ExecutionSummary {...DEFAULT_PROPS} referenceDate={referenceDate} />
        )

        expect(getByText(text)).to.be.visible
        expect(getByText('last run')).to.be.visible
      })
    }
  })

  describe('run duration', () => {
    const examples: [text: string, finishDate: Date][] = [
      ['1 hour 45 minutes 23 seconds', add(startDate, { hours: 1, minutes: 45, seconds: 23 })],
      ['12 minutes 15 seconds', add(startDate, { minutes: 12, seconds: 15 })],
      ['10 seconds', add(startDate, { seconds: 10.01 })],
      ['9.88 seconds', addMilliseconds(startDate, 9876)],
      ['6.54 seconds', addMilliseconds(startDate, 6543)],
    ]

    for (const [text, finishDate] of examples) {
      it(`should render correctly for ${text}`, () => {
        const { getByText } = render(
          <ExecutionSummary
            {...DEFAULT_PROPS}
            testRunFinished={{
              timestamp: TimeConversion.millisecondsSinceEpochToTimestamp(finishDate.getTime()),
              success: false,
            }}
          />
        )

        expect(getByText(text)).to.be.visible
        expect(getByText('duration')).to.be.visible
      })
    }
  })

  describe('passed rate', () => {
    const examples: [passed: number, total: number, percentage: string][] = [
      [13, 45, '29%'],
      [5, 45, '11%'],
      [45, 45, '100%'],
      [0, 45, '0%'],
      [0, 0, '0%'],
    ]

    for (const [passed, total, percentage] of examples) {
      it(`should render correctly for ${percentage} passed`, () => {
        const { getByText } = render(
          <ExecutionSummary
            {...DEFAULT_PROPS}
            scenarioCountByStatus={{
              ...makeEmptyScenarioCountsByStatus(),
              [TestStepResultStatus.PASSED]: passed,
            }}
            totalScenarioCount={total}
          />
        )

        expect(getByText(`${percentage} passed`)).to.be.visible
        expect(getByText(`${total} executed`)).to.be.visible
      })
    }
  })

  describe('meta', () => {
    it('should include the implementation name and version', () => {
      const { getByText } = render(<ExecutionSummary {...DEFAULT_PROPS} />)

      expect(getByText('cucumber-js 8.0.0-rc.1')).to.be.visible
    })
    it('should include the job link', () => {
      const { getByText } = render(<ExecutionSummary {...DEFAULT_PROPS} />)
      const jobLinkElement = getByText(DEFAULT_PROPS.meta?.ci?.buildNumber as string)
      expect(jobLinkElement).to.be.visible
      expect(jobLinkElement.getAttribute('href')).to.eq(DEFAULT_PROPS.meta?.ci?.url)
    })
  })
})

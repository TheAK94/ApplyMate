
import asyncio
from browser_use import Agent, Browser, ChatOpenAI
from config import OPENAI_MODEL


async def main():
    llm = ChatOpenAI(
        model=OPENAI_MODEL
    )

    browser = Browser(
        cdp_url="http://localhost:9222",
        keep_alive=True,
    )

    agent = Agent(
        task = """
        You are ApplyMate, an autonomous internship application assistant.

        Your goal is to fill out the internship application in the currently active Chrome tab.

        WORKFLOW:

        1. Inspect the currently active page.

        2. If it is an internship details page:
        - Find the appropriate Apply Now, Apply, or Start Application button.
        - Click it to open the application form.
        - Follow redirects if necessary.

        3. If an application form is already open:
        - Start filling it immediately.

        4. Inspect the form carefully:
        - Identify text fields, email fields, phone fields,
            textareas, dropdowns, radio buttons, and checkboxes.
        - Understand each field from its label and surrounding context.
        - Identify required fields.
        - Identify resume or document upload controls.

        5. Fill fields only when the required information is
        available and reliable.
        - Never invent personal information.
        - Never guess unknown answers.
        - Leave unknown fields unfilled.
        - Do not overwrite existing information unnecessarily.

        6. MULTI-STEP APPLICATIONS:
        - After completing the current step, look for Continue,
            Next, or similar navigation buttons.
        - Click the appropriate button to move to the next step.
        - Wait for the next page or form to load.
        - Inspect and fill the newly available fields.
        - Repeat until the application reaches its final review
            or submission stage.

        7. STOP before final submission.

        STRICT RULES:
        - Never click Submit, Submit Application, Finish,
        or any final submission button.
        - Never claim a field was filled unless it was actually filled.
        - Do not bypass CAPTCHAs or security controls.
        - Do not switch to unrelated Chrome tabs.
        - Do not navigate to unrelated websites.
        - Report fields that could not be completed.

        At the end, report:
        - Pages or steps completed.
        - Fields successfully filled.
        - Fields left incomplete and why.
        - Whether the application is ready for review.
        """,
        browser=browser,
        llm=llm,
    )

    try:
        result = await agent.run()

        print("\n========== AGENT RESULT ==========")
        print(result)

    except Exception as error:
        print(f"\nAgent error: {error}")

    finally:
        await browser.stop()


if __name__ == "__main__":
    asyncio.run(main())

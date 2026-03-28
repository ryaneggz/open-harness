---
url: https://www.linkedin.com/posts/ryan-eggleston_github-ruska-aiorchestra-steerable-harnesses-activity-7431721460412526595-cXhI
extracted: 2026-03-28T04:42:40Z
---

## Post Text

Orchestra PRs: 10+ Shipments and AI Velocity
This title was summarized by AI from the post below.
Ryan Eggleston

CleanSpark•1K followers

1mo  Edited

I shipped 10+ PRs to Orchestra this weekend.

Here's what went out for Ruska AI 👇

🎨 Monaco tool display
🔧 Streaming JSON parse fix 
📋 Shared Tasks System (Reproducible Work)
💾 Memory migration (Backend State)
🔍 Search threads tool (Past Session Recall)
🖥️ Sandboxed Backends (Daytona/Docker)
🔗 Subagent selection persistence

That's not a roadmap. That's a Tuesday.

When your AI agents contribute alongside humans, velocity stops being linear — it compounds.

Open source. Self-hostable. Shipping daily.

🔗 https://lnkd.in/gPjAjuwC

GitHub - ruska-ai/orchestra: Steerable Harnesses for DeepAgents — Orchestra🪶
github.com
5
1 Comment
Like
Comment
Share
Ryan Eggleston

CleanSpark•1K followers

1mo

Currently in the process of automating my social content. Automation is like tuning a 🎸

Like
Reply

To view or add a comment, sign in

More Relevant Posts
Digvijay Jadhav

Scrobits Technologies•3K followers

2w

Most AI agents work well in demos.

Production is where they hit the reality.

This repo highlights what actually breaks when AI agents move beyond prototypes.

𝗔𝗴𝗲𝗻𝘁𝘀 𝗧𝗼𝘄𝗮𝗿𝗱𝘀 𝗣𝗿𝗼𝗱𝘂𝗰𝘁𝗶𝗼𝗻 (https://lnkd.in/dUrAyJ2W)

Instead of focusing on prompts or model performance, it focuses on the engineering layers around agent systems.

The parts that usually fail in real workloads.

The repo walks through:

Memory management for agents
Reliable tool usage patterns
Evaluation pipelines for agent behavior
Guardrails and safety mechanisms
Multi-agent coordination strategies

It also shows practical infrastructure patterns using FastAPI, Docker, Redis, and vector databases.

Actual system design patterns for production agent systems.

If you're building agentic AI applications, this is a useful resource to explore.

https://lnkd.in/dUrAyJ2W


#AgenticAI #AIEngineering #LLMEngineering

GitHub - NirDiamant/agents-towards-production: This repository delivers end-to-end, code-first tutorials covering every layer of production-grade GenAI agents, guiding you from spark to scale with proven patterns and reusable blueprints for real-world launches.
github.com
26
Like
Comment
Share

To view or add a comment, sign in

Yuchen Lin

CAE•1K followers

1w

I’ve been working on an open-source project called Project Memory, and I just released v1.0.0.

The idea is pretty simple:

a lot of AI systems still don’t really have memory.
Not real memory, anyway.

They can sound smart in a single conversation, but over time they drift.
They forget goals.
They lose constraints.
They overwrite decisions.
They stop feeling coherent.

So I wanted to build something focused on that problem.

Project Memory is an open-source, self-hosted long-term memory engine for AI assistants.

Not a chat shell.
Not a model hosting platform.
Not a giant agent framework.

Just a memory engine, built for developers working with local models or BYOM setups.

The focus is:
- lower-drift memory consolidation
- replayable protected state
- grounded answers with evidence
- benchmarkable memory quality

v1.0.0 is the first version where the core system feels real to me:
- replayable state
- low-drift digest pipeline
- grounded answer flow
- benchmark / drift / replay / ablation tooling
- local-model-friendly provider config

I think a lot of AI products still treat memory as a side feature.
My bet is that memory becomes part of the core infrastructure layer.

That’s what I’m trying to build here.

GitHub: https://lnkd.in/gj8wwuZ7

If you’re building local AI assistants, self-hosted AI tools, or anything where long-running memory actually matters, I’d love to hear what you think.


GitHub - yul761/ProjectMemory: Self-hosted long-term memory engine for AI assistants with replayable state, low-drift digests, and grounded recall.
github.com
1
Like
Comment
Share

To view or add a comment, sign in

Grizzly Peak Software

23 followers

1w

I spent six months building increasingly complex AI agents. Single agent, massive system prompt, dozens of tools.
It worked — until it didn't.
At some point, every single-agent system hits a ceiling. The prompt gets too long. The tools conflict. The agent starts hallucinating because it's trying to be an expert at everything simultaneously.
The fix wasn't a better prompt. It was a different architecture.
I wrote a book about building that architecture: a multi-agent orchestrator in Node.js where a router agent classifies intent and delegates to specialized agents — each with its own focused prompt, tools, and context.
15 chapters of real, runnable code. No frameworks to install. No abstractions to fight. You build the orchestrator from scratch and understand every line.
Companion repo: https://lnkd.in/gpx2Gk6j
📖 https://lnkd.in/g7a73A3P
#AI #NodeJS #SoftwareEngineering #AIAgents #LLM

Building a Multi-Agent Orchestrator in Node.js: Coordinating Specialized Agents with a Router Agent (The Agent Stack: LLMs, Agents, and Multi-Agent Systems Book 3)
amazon.com
Like
Comment
Share

To view or add a comment, sign in

Sai Sumanth Avara

Zemoso Technologies•2K followers

1w

The "MCP is dead, use CLI" crowd is just the same hype cycle that made MCP famous 6 months ago — running in reverse.

Here's what most people miss in this debate:

CLI token savings are real... but limited.

If the tool exists in the model's training data (git, curl, grep, aws cli), yes — the model already knows how to use it. No schema needed. Huge win.

But the moment you build a CUSTOM CLI tool? You're back to writing descriptions, schemas, and docs so the agent knows what to do.

Congrats. You just rebuilt MCP. Without the structure.

And here's the part nobody's talking about:

Most of this debate confuses MCP over stdio (local, arguably overkill) with MCP over HTTP (centralized, genuinely powerful).

For teams and orgs, remote MCP unlocks things a CLI simply can't:
→ Centralized auth — no API keys scattered across dev machines
→ Telemetry — which tools are actually working?
→ Live updates — no more stale docs or out-of-sync tooling
→ Org-wide consistency across every agent, repo, and runtime

A solo vibe-coder? Sure, use CLIs. They're great.

A 20-person engineering team shipping AI-assisted code at scale? You need SOS (Structure, Observability, and Security). That's MCP.

The tool isn't the problem. The hype cycle is.

#AI #MCP #AgenticAI #CLI #GenerativeAI

48
4 Comments
Like
Comment
Share

To view or add a comment, sign in

Shane Larson

CortexAgent•1K followers

1w

I spent six months building increasingly complex AI agents. Single agent, massive system prompt, dozens of tools.
It worked — until it didn't.
At some point, every single-agent system hits a ceiling. The prompt gets too long. The tools conflict. The agent starts hallucinating because it's trying to be an expert at everything simultaneously.
The fix wasn't a better prompt. It was a different architecture.
I wrote a book about building that architecture: a multi-agent orchestrator in Node.js where a router agent classifies intent and delegates to specialized agents — each with its own focused prompt, tools, and context.
15 chapters of real, runnable code. No frameworks to install. No abstractions to fight. You build the orchestrator from scratch and understand every line.
Companion repo: https://lnkd.in/gyScDbQv
📖 https://lnkd.in/gemh5RFi
#AI #NodeJS #SoftwareEngineering #AIAgents #LLM

Building a Multi-Agent Orchestrator in Node.js: Coordinating Specialized Agents with a Router Agent (The Agent Stack: LLMs, Agents, and Multi-Agent Systems Book 3)
amazon.com
1
Like
Comment
Share

To view or add a comment, sign in

Patrick Gibbs

Epiphany Dynamics•418 followers

4d

Spent months building with MCPs.

CLIs actually do more.

Six months ago I was setting up MCP servers for everything my agents touched.

Notion MCP. Google Workspace MCP. GitHub MCP. Everyone in AI was calling MCP "the USB-C for AI integrations" — so I went all in.

Then I actually tested both side by side.

CLIs outperformed MCPs on the same tasks. Here's the breakdown:

API = raw HTTP calls to a service. Works, but your agent needs custom client code for everything. No AI-native structure built in.

MCP = a standardized protocol built specifically for AI agents. Structured schemas, auth, tool discovery. Great for remote or unfamiliar systems.

CLI = just run the command. git commit. docker build. bun run. No schema. No overhead. Just execute.

Why CLI wins when it's available:
→ Up to 10x fewer tokens on known tasks
→ No schema loading = more context for actual work
→ Fewer moving parts = fewer failure points

Building automations for clients, the pattern holds every time: if a CLI exists for the tool, my agents perform better using it over the MCP equivalent.

Less token burn. More throughput. Easier to debug when something breaks.

MCP still earns its spot — remote APIs, enterprise auth, multi-tenant systems, anything your agent hasn't touched before. But it's not the default answer.

My rule now: CLI first. MCP when there's no CLI. API when you need custom control.

What tools are your agents using? Curious whether others are defaulting to MCPs or going CLI-first.

#AIAgents #AIAutomation #LLMDevelopment #AgentDevelopment #BuildingWithAI

1
1 Comment
Like
Comment
Share

To view or add a comment, sign in

GyaanSetu AI (Artificial Intelligence)

799 followers

2w

𝗧𝗵𝗲 𝗣𝗿𝗼𝗯𝗹𝗲𝗺 𝗪𝗶𝗍𝗵 𝗔𝗜 𝗔𝗹𝗴𝗼𝗿𝗶𝗍𝗵𝗺𝘀
You need to understand the difference between a chatbot and an AI agent. 
- A chatbot is simple: it takes text in, sends it to a language model, and sends the text back out. 
- An AI agent is different: it needs to plan, act, and remember. 

For example, an AI agent might break down a request like "review this code" into multiple steps. 
It would fetch files, gather context, and analyze things in a certain order. 
Then it would use tools like GitHub API or Slack to get information from the world. 
Finally, it would preserve its state across many iterations and tool calls. 

We learned this the hard way when we tried to build a GitHub PR review agent. 
Our initial design was simple: a user would paste a GitHub link, our API would hold the connection open, and our agent would do its thing. 
But this design failed in production. 
Users would time out, and our agent would keep running in the background, consuming resources. 
Our Kubernetes autoscaler wouldn't scale because CPU usage was low, even under heavy load. 
And when our pod restarted, all our agent's state was lost. 

We realized that AI agents can't be treated like traditional web requests. 
They need an asynchronous job model, where work is queued and processed independently. 
So we split our monolith into a dumb API and a smart worker. 
We adopted checkpointed state, where our agent saves its memory to a database after each step. 
And we moved to event-driven autoscaling, where we scale based on the length of our queue. 

In our next post, we'll walk through our new architecture and how we made our system production-ready. 
Source: https://lnkd.in/giea899X
Optional learning community: https://t.me/GyaanSetuAi

Like
Comment
Share

To view or add a comment, sign in

Ajay Kumar

Amazon Web Services (AWS)•86 followers

1w

Just completed the “Bedrock AgentCore with Strands Agents & Nova Pro” hands-on workshop as part of the BeSA workshop series.

This session focused on something I have been really curious about lately that how AI agents move from experiments to production systems.
The workshop walked through the new Amazon Bedrock AgentCore capabilities and how they provide the infrastructure layer needed to build and run agentic AI systems at scale.

Across the labs, we explored several key components:
• AgentCore Code Interpreter – enabling agents to execute Python safely for computation and data processing
 • AgentCore Browser – allowing agents to interact with websites and automate web workflows 
• AgentCore Identity – securely managing API keys and credentials for external services
 • AgentCore Runtime – deploying MCP servers and agent workloads in a managed environment 
• AgentCore Observability – tracing agent reasoning, tool calls and performance through CloudWatch 
• AgentCore Memory – enabling both short-term conversation context and long-term knowledge retention
 • AgentCore Gateway – converting OpenAPI specifications into MCP tools through a managed gateway so agents can securely interact with external APIs
One particularly interesting part was generating MCP tools from an OpenAPI specification using AgentCore Gateway and then connecting those tools to a Strands Agent powered by Amazon Nova Pro.
Overall, it was great to see how Strands Agents + Nova Pro + AgentCore infrastructure come together to support production-ready AI agent systems.

Thanks to Ashish Prajapati & the BeSA Workshop Team for organizing such detailed and hands-on sessions.
Really enjoyed this one and learned quite a bit along the way.

#AWS #AmazonBedrock #AgenticAI #StrandsAgents #GenerativeAI #AIEngineering #CloudComputing

6
Like
Comment
Share

To view or add a comment, sign in

Saba Tchikhinashvili

Opsy•3K followers

3w

AI agents got mass better at generating infrastructure code.
But the tools around them still assume a human is driving every step.

Every CI/CD pipeline, every IaC workflow, every deployment tool was designed for human operators. Human judgement at every checkpoint. Human accountability baked into the flow.

The problem now isn't code generation. It's that nothing in the current toolchain is designed for an agent to safely propose changes at scale while keeping humans accountable for what actually runs.

That's what I'm working on with Opsy.

An agent can generate as many infrastructure changes as it wants. But none of them can be applied without a human reviewing and approving the exact diff.

This screenshot is from a real run. My agent proposed 5 AWS resources. I saw every resource, every property, every tag before anything was created. Approved it. 10 seconds to apply.

The agent did the tedious part. I kept the decision-making.

10
3 Comments
Like
Comment
Share

To view or add a comment, sign in

Subash Vantipalli

AI Consultant | Enterprise AI…•917 followers

1w  Edited

If you want to build custom agents that can go beyond basic tool-calling, Deep Agents are worth checking out.

They’re built for complex, multi-step tasks with support for planning, subagents, long-term memory, and filesystem tools for context management. And if you want to run a coding agent locally, the Deep Agents CLI is built on the same SDK.

https://lnkd.in/gTQyBzgf

For teams trying to build an OpenClaw-style web agent experience, this looks like a promising agent foundation to explore.

#AI #AgenticAI #DeepAgents #LangChain #OpenSource

Deep Agents overview - Docs by LangChain
docs.langchain.com
5
Like
Comment
Share

To view or add a comment, sign in

1,302 followers

245 Posts
 1 Article
View Profile  Connect
More from this author
How My Computer Is Programming Me..
Ryan Eggleston  6y
Explore content categories
Career
Productivity
Finance
Soft Skills & Emotional Intelligence
Project Management
Education
Show more 

## Raw Snapshot

```
- generic
  - dialog "Sign in to view more content"
    - button "Dismiss" [ref=e1]
    - image
    - heading "Sign in to view more content" [level=2, ref=e2]
    - paragraph
      - StaticText "Create your free account or sign in to continue your search"
    - button "Continue with google" [ref=e3]
      - generic
        - Iframe "Sign in with Google Button" [ref=e10]
    - button "Sign in with Email" [ref=e4]
      - StaticText "Sign in with Email"
    - paragraph
      - StaticText "or"
    - button "Continue with google" [ref=e5]
      - generic
        - Iframe "Sign in with Google Button" [ref=e11]
    - paragraph
      - link "Join now" [ref=e6]
    - paragraph
      - link "User Agreement" [ref=e7]
      - link "Privacy Policy" [ref=e8]
      - link "Cookie Policy" [ref=e9]
```

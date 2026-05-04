import { anthropic } from "@ai-sdk/anthropic";
import {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1Message,
} from "@ai-sdk/provider";

const MODEL = "claude-sonnet-4-6";

export class MockLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV1Message[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          // Extract text from content parts
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private getLastToolResult(messages: LanguageModelV1Message[]): any {
    // Find the last tool message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tool") {
        const content = messages[i].content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0];
        }
      }
    }
    return null;
  }

  private async *generateMockStream(
    messages: LanguageModelV1Message[],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    // Count tool messages to determine which step we're on
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    // Determine component type from the original user prompt
    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (
      promptLower.includes("dashboard") ||
      promptLower.includes("stat") ||
      promptLower.includes("metric") ||
      promptLower.includes("revenue") ||
      promptLower.includes("analytics")
    ) {
      componentType = "dashboard";
      componentName = "Dashboard";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    }

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_1`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 2: Enhance component
    if (toolMessageCount === 2) {
      const text = `Now let me enhance the component with better styling.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_2`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 3: Create App.jsx
    if (toolMessageCount === 0) {
      const text = `This is a static response. You can place an Anthropic API key in the .env file to use the Anthropic API for component generation. Let me create an App.jsx file to display the component.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(15);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_3`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 4: Final summary (no tool call)
    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:

1. **${componentName}.jsx** - A fully-featured ${componentType} component
2. **App.jsx** - The main app file that displays the component

The component is now ready to use. You can see the preview on the right side of the screen.`;

      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(30);
      }

      yield {
        type: "finish",
        finishReason: "stop",
        usage: {
          promptTokens: 50,
          completionTokens: 50,
        },
      };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "dashboard":
        return `import { Users, UserCheck, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

const stats = [
  {
    label: 'Total Users',
    value: '24,521',
    change: '+12%',
    trend: 'up',
    icon: Users,
    accent: 'bg-indigo-50 text-indigo-600',
  },
  {
    label: 'Active Users',
    value: '18,340',
    change: '+8%',
    trend: 'up',
    icon: UserCheck,
    accent: 'bg-emerald-50 text-emerald-600',
  },
  {
    label: 'Revenue',
    value: '$94,200',
    change: '-3%',
    trend: 'down',
    icon: DollarSign,
    accent: 'bg-violet-50 text-violet-600',
  },
];

const StatCard = ({ label, value, change, trend, icon: Icon, accent }) => (
  <div className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-6 flex flex-col gap-4 hover:shadow-md transition-all duration-200">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className={\`p-2 rounded-lg \${accent}\`}>
        <Icon size={18} />
      </span>
    </div>
    <div className="flex items-end justify-between">
      <span className="text-3xl font-bold text-slate-800">{value}</span>
      <span className={\`flex items-center gap-1 text-sm font-medium \${trend === 'up' ? 'text-emerald-600' : 'text-rose-500'}\`}>
        {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        {change} vs last month
      </span>
    </div>
  </div>
);

const Dashboard = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
    {stats.map((stat) => (
      <StatCard key={stat.label} {...stat} />
    ))}
  </div>
);

export default Dashboard;`;

      case "form":
        return `import { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-sm ring-1 ring-black/5 text-center">
        <div className="text-4xl mb-3">✓</div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Message sent!</h3>
        <p className="text-sm text-slate-500">We'll get back to you within 24 hours.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-sm ring-1 ring-black/5">
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Contact Us</h2>
      <p className="text-sm text-slate-500 mb-6">We'd love to hear from you.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">Message</label>
          <textarea id="message" name="message" value={formData.message} onChange={handleChange} required rows={4}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none" />
        </div>
        <button type="submit"
          className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `const Card = ({
  title = 'Acme Pro Plan',
  description = 'Everything you need to scale your team. Unlimited projects, priority support, and advanced analytics.',
  badge = 'Most Popular',
  price = '$49',
  period = '/month',
  features = ['Unlimited projects', 'Priority support', 'Advanced analytics', 'Custom integrations'],
}) => (
  <div className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 overflow-hidden hover:shadow-md transition-all duration-200">
    <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
      <h3 className="text-white font-semibold text-lg">{title}</h3>
      {badge && <span className="bg-white/20 text-white text-xs font-medium px-2.5 py-1 rounded-full">{badge}</span>}
    </div>
    <div className="p-6">
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-4xl font-bold text-slate-800">{price}</span>
        <span className="text-slate-500 text-sm">{period}</span>
      </div>
      <p className="text-sm text-slate-500 mb-5">{description}</p>
      <ul className="space-y-2 mb-6">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
            <span className="text-indigo-500 font-bold">✓</span> {f}
          </li>
        ))}
      </ul>
      <button className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
        Get started
      </button>
    </div>
  </div>
);

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-xl shadow-sm ring-1 ring-black/5">
      <h2 className="text-xl font-semibold text-slate-700">Counter</h2>
      <div className="text-6xl font-bold text-slate-800 tabular-nums w-24 text-center">{count}</div>
      <div className="flex gap-3">
        <button onClick={() => setCount((c) => c - 1)}
          className="px-5 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors">
          −
        </button>
        <button onClick={() => setCount(0)}
          className="px-5 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
          Reset
        </button>
        <button onClick={() => setCount((c) => c + 1)}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          +
        </button>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "dashboard":
        return "grid grid-cols-1 sm:grid-cols-3 gap-6";
      case "form":
        return "setSubmitted(true);";
      case "card":
        return "Get started";
      default:
        return 'className="text-6xl font-bold text-slate-800 tabular-nums w-24 text-center"';
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "dashboard":
        return "grid grid-cols-1 sm:grid-cols-3 gap-6 w-full";
      case "form":
        return "setSubmitted(true);\n    setFormData({ name: '', email: '', message: '' });";
      case "card":
        return "Get started →";
      default:
        return 'className="text-6xl font-bold text-indigo-600 tabular-nums w-24 text-center"';
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "Dashboard") {
      return `import Dashboard from '@/components/Dashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Your key metrics at a glance</p>
        </div>
        <Dashboard />
      </div>
    </div>
  );
}`;
    }

    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <Card />
      </div>
    </div>
  );
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <${componentName} />
      </div>
    </div>
  );
}`;
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    // Collect all stream parts
    const parts: LanguageModelV1StreamPart[] = [];
    for await (const part of this.generateMockStream(
      options.prompt,
      userPrompt
    )) {
      parts.push(part);
    }

    // Build response from parts
    const textParts = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).textDelta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        toolCallType: "function" as const,
        toolCallId: (p as any).toolCallId,
        toolName: (p as any).toolName,
        args: (p as any).args,
      }));

    // Get finish reason from finish part
    const finishPart = parts.find((p) => p.type === "finish") as any;
    const finishReason = finishPart?.finishReason || "stop";

    return {
      text: textParts,
      toolCalls,
      finishReason: finishReason as any,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
      },
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        },
      },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
      rawResponse: { headers: {} },
    };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey || apiKey === "your-api-key-here") {
    console.log(
      "ANTHROPIC_API_KEY is not set (or is still the placeholder). " +
        "Using the mock provider — responses will be canned. " +
        "Set a real key in .env to generate components with Claude."
    );
    return new MockLanguageModel("mock-" + MODEL);
  }

  return anthropic(MODEL);
}

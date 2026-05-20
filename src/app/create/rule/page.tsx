"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";

const ruleFields = [
  { value: "ball_runs", label: "Ball Runs", description: "Runs scored on this ball" },
  { value: "over_number", label: "Over Number", description: "Current over (1, 2, 3...)" },
  { value: "dismissal_type", label: "Dismissal", description: "How the batsman got out" },
  { value: "wickets", label: "Wickets Fallen", description: "Total wickets in innings" },
  { value: "score", label: "Team Score", description: "Total runs scored" },
];

const operators = [
  { value: "equals", label: "equals", symbol: "=" },
  { value: "not_equals", label: "not equals", symbol: "≠" },
  { value: "greater_than", label: "greater than", symbol: ">" },
  { value: "less_than", label: "less than", symbol: "<" },
  { value: "in", label: "is one of", symbol: "∈" },
];

const actionTypes = [
  { value: "bonus_runs", label: "Award Bonus Runs", icon: "⚡", description: "Add extra runs to the batting team" },
  { value: "modify_runs", label: "Modify Runs", icon: "🎯", description: "Change the number of runs scored" },
  { value: "deduct_runs", label: "Deduct Runs", icon: "💥", description: "Remove runs from the batting team" },
  { value: "message", label: "Show Message", icon: "💬", description: "Display a celebration message" },
  { value: "extra_ball", label: "Award Extra Ball", icon: "🔄", description: "Grant an additional ball" },
  { value: "nullify_ball", label: "Nullify Ball", icon: "⏸️", description: "Cancel the current ball" },
];

const ruleTemplates = [
  {
    name: "Six Multiplier",
    description: "When a six is hit, award only 3 runs instead of 6",
    icon: "🔢",
    color: "#F59E0B",
    conditions: [{ field: "ball_runs", operator: "equals", value: "6" }],
    actions: [{ type: "modify_runs", value: "3", target: "batting" }],
  },
  {
    name: "Powerplay Bonus",
    description: "+2 runs per over during overs 1-6",
    icon: "⚡",
    color: "#10B981",
    conditions: [
      { field: "over_number", operator: "greater_than", value: "0" },
      { field: "over_number", operator: "less_than", value: "7" },
    ],
    actions: [{ type: "bonus_runs", value: "2", target: "batting" }],
  },
  {
    name: "Death Over Power",
    description: "+3 runs if 6+ scored in the last 2 overs",
    icon: "🔥",
    color: "#EF4444",
    conditions: [{ field: "over_number", operator: "greater_than", value: "17" }],
    actions: [{ type: "bonus_runs", value: "3", target: "batting" }],
  },
  {
    name: "Golden Duck",
    description: "Bowler gets +5 bonus runs when batsman dismissed first ball",
    icon: "💀",
    color: "#8B5CF6",
    conditions: [{ field: "dismissal_type", operator: "in", value: "bowled,caught,lbw,stumped,hit_wicket" }],
    actions: [{ type: "bonus_runs", value: "5", target: "bowling" }],
  },
  {
    name: "Hat-Trick Hero",
    description: "+10 runs for bowler who takes wickets on 3 consecutive balls",
    icon: "🎯",
    color: "#10B981",
    conditions: [{ field: "wickets", operator: "equals", value: "3" }],
    actions: [{ type: "bonus_runs", value: "10", target: "bowling" }],
  },
];

export default function CreateRulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [rule, setRule] = useState({
    name: "",
    description: "",
    icon: "⚡",
    color: "#8B5CF6",
    conditions: [] as { field: string; operator: string; value: string }[],
    actions: [] as { type: string; value: string; target: string }[],
  });

  const applyTemplate = (template: typeof ruleTemplates[0]) => {
    setSelectedTemplate(template.name);
    setRule({
      name: template.name,
      description: template.description,
      icon: template.icon,
      color: template.color,
      conditions: template.conditions.map((c) => ({ ...c, value: String(c.value) })),
      actions: template.actions,
    });
  };

  const addCondition = () => {
    setRule({
      ...rule,
      conditions: [...rule.conditions, { field: "ball_runs", operator: "equals", value: "6" }],
    });
  };

  const removeCondition = (index: number) => {
    setRule({
      ...rule,
      conditions: rule.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (index: number, updates: Partial<typeof rule.conditions[0]>) => {
    const newConditions = [...rule.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setRule({ ...rule, conditions: newConditions });
  };

  const addAction = () => {
    setRule({
      ...rule,
      actions: [...rule.actions, { type: "bonus_runs", value: "1", target: "batting" }],
    });
  };

  const removeAction = (index: number) => {
    setRule({
      ...rule,
      actions: rule.actions.filter((_, i) => i !== index),
    });
  };

  const updateAction = (index: number, updates: Partial<typeof rule.actions[0]>) => {
    const newActions = [...rule.actions];
    newActions[index] = { ...newActions[index], ...updates };
    setRule({ ...rule, actions: newActions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rule.conditions.length === 0 || rule.actions.length === 0) {
      alert("Please add at least one condition and one action");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // Create a demo match for the rule (in real app, you'd select a match)
    const { data: match } = await supabase
      .from("matches")
      .select("id")
      .eq("created_by", user.id)
      .single();

    if (match) {
      const { error } = await supabase.from("custom_rules").insert({
        match_id: match.id,
        name: rule.name,
        description: rule.description,
        icon: rule.icon,
        color: rule.color,
        created_by: user.id,
        is_enabled: true,
        priority: 0,
      });

      if (!error) {
        router.push("/dashboard/rules");
      }
    }

    setLoading(false);
  };

  const naturalLanguagePreview = () => {
    const parts: string[] = [];
    if (rule.conditions.length > 0) {
      const first = rule.conditions[0];
      const fieldLabel = ruleFields.find((f) => f.value === first.field)?.label || first.field;
      const opSymbol = operators.find((o) => o.value === first.operator)?.symbol || first.operator;
      parts.push(`When ${fieldLabel.toLowerCase()} ${opSymbol} ${first.value}`);
    }
    if (rule.actions.length > 0) {
      const action = rule.actions[0];
      const actionLabel = actionTypes.find((a) => a.value === action.type)?.label || action.type;
      parts.push(`→ ${actionLabel}: ${action.value}`);
    }
    return parts.join(" ") || "Configure your rule above...";
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#F1F5F9]">Create Custom Rule</h1>
        <p className="text-[#64748B] mt-1">Design a rule that modifies scoring during matches</p>
      </div>

      {/* Templates */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide mb-3">Quick Templates</h2>
        <div className="grid grid-cols-2 gap-3">
          {ruleTemplates.map((template) => (
            <button
              key={template.name}
              onClick={() => applyTemplate(template)}
              className={`card p-4 text-left hover:border-[${template.color}]/50 transition-all ${
                selectedTemplate === template.name ? "border-[#10B981]" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{template.icon}</span>
                <span className="font-semibold text-[#F1F5F9]">{template.name}</span>
              </div>
              <p className="text-xs text-[#64748B]">{template.description}</p>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Rule Details</h2>
          <div className="space-y-4">
            <div>
              <label className="input-label">Rule Name *</label>
              <input
                type="text"
                value={rule.name}
                onChange={(e) => setRule({ ...rule, name: e.target.value })}
                className="input"
                placeholder="Six Multiplier"
                required
              />
            </div>
            <div>
              <label className="input-label">Description</label>
              <input
                type="text"
                value={rule.description}
                onChange={(e) => setRule({ ...rule, description: e.target.value })}
                className="input"
                placeholder="When a six is hit, award only 3 runs"
              />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label className="input-label">Icon</label>
                <div className="flex items-center gap-2">
                  {["⚡", "🎯", "🔥", "💥", "💬", "🔢"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setRule({ ...rule, icon: emoji })}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                        rule.icon === emoji
                          ? "bg-[#10B981]/20 border-2 border-[#10B981]"
                          : "bg-[#232738] border border-[#2D3748] hover:border-[#3D4758]"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="input-label">Color</label>
                <div className="flex items-center gap-2">
                  {["#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#3B82F6"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setRule({ ...rule, color })}
                      className={`w-8 h-8 rounded-full transition-all ${
                        rule.color === color ? "ring-2 ring-offset-2 ring-offset-[#1A1D27]" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Natural language preview */}
        <div className="bg-gradient-to-r from-[#8B5CF6]/10 to-transparent border border-[#8B5CF6]/20 rounded-xl p-4">
          <div className="text-xs font-semibold text-[#8B5CF6] uppercase tracking-wide mb-2">Preview</div>
          <div className="text-lg text-[#F1F5F9] font-medium">{naturalLanguagePreview()}</div>
        </div>

        {/* Conditions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#F1F5F9]">Conditions</h2>
            <button
              type="button"
              onClick={addCondition}
              className="btn btn-secondary text-sm py-2"
            >
              <PlusIcon className="w-4 h-4" />
              Add Condition
            </button>
          </div>

          {rule.conditions.length === 0 ? (
            <div className="text-center py-8 text-[#64748B] text-sm border border-dashed border-[#2D3748] rounded-xl">
              No conditions yet. Add a condition to define when this rule triggers.
            </div>
          ) : (
            <div className="space-y-3">
              {rule.conditions.map((condition, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-[#232738] rounded-xl">
                  <span className="text-xs text-[#64748B] w-6">IF</span>
                  <select
                    value={condition.field}
                    onChange={(e) => updateCondition(index, { field: e.target.value })}
                    className="input py-2 text-sm flex-1"
                  >
                    {ruleFields.map((field) => (
                      <option key={field.value} value={field.value}>{field.label}</option>
                    ))}
                  </select>
                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, { operator: e.target.value })}
                    className="input py-2 text-sm w-40"
                  >
                    {operators.map((op) => (
                      <option key={op.value} value={op.value}>{op.label} ({op.symbol})</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    className="input py-2 text-sm w-24"
                    placeholder="Value"
                  />
                  <button
                    type="button"
                    onClick={() => removeCondition(index)}
                    className="p-2 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#F1F5F9]">Actions</h2>
            <button
              type="button"
              onClick={addAction}
              className="btn btn-secondary text-sm py-2"
            >
              <PlusIcon className="w-4 h-4" />
              Add Action
            </button>
          </div>

          {rule.actions.length === 0 ? (
            <div className="text-center py-8 text-[#64748B] text-sm border border-dashed border-[#2D3748] rounded-xl">
              No actions yet. Add an action to define what happens when this rule triggers.
            </div>
          ) : (
            <div className="space-y-3">
              {rule.actions.map((action, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-[#232738] rounded-xl">
                  <span className="text-xs text-[#10B981] w-6">THEN</span>
                  <select
                    value={action.type}
                    onChange={(e) => updateAction(index, { type: e.target.value })}
                    className="input py-2 text-sm flex-1"
                  >
                    {actionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={action.value}
                    onChange={(e) => updateAction(index, { value: e.target.value })}
                    className="input py-2 text-sm w-24"
                    placeholder="Value"
                  />
                  <select
                    value={action.target}
                    onChange={(e) => updateAction(index, { target: e.target.value })}
                    className="input py-2 text-sm w-28"
                  >
                    <option value="batting">Batting</option>
                    <option value="bowling">Bowling</option>
                    <option value="both">Both</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeAction(index)}
                    className="p-2 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full py-4 text-base disabled:opacity-50"
        >
          {loading ? "Creating Rule..." : "Create Rule →"}
        </button>
      </form>
    </div>
  );
}
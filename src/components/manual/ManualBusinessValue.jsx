import { motion } from "framer-motion";
import { TrendingDown, Clock, ShieldCheck, Wrench, DollarSign, BarChart3, Server, Headphones } from "lucide-react";

export default function ManualBusinessValue() {
  const benefits = [
    {
      icon: Clock,
      title: "Reduce ATM Downtime",
      text: "By tracking fault durations and identifying slow-resolution patterns, teams can prioritize the most impactful issues and cut average downtime significantly.",
    },
    {
      icon: TrendingDown,
      title: "Identify Recurring Faults",
      text: "Fault type breakdowns and terminal rankings reveal which ATMs and components fail most frequently — enabling preventive maintenance before issues repeat.",
    },
    {
      icon: Wrench,
      title: "Improve Technician Performance",
      text: "The 'Solved By' field and resolution rate metrics allow managers to evaluate technician effectiveness and allocate field resources more strategically.",
    },
    {
      icon: DollarSign,
      title: "Optimize Maintenance Costs",
      text: "Understanding which vendors, branches, and fault types drive the most maintenance activity helps negotiate better service contracts and reduce cost per incident.",
    },
    {
      icon: BarChart3,
      title: "Data-Driven Decision Making",
      text: "Trend charts over 7-day windows and batch comparisons replace gut-feel decisions with quantified evidence, improving planning accuracy.",
    },
    {
      icon: ShieldCheck,
      title: "Enhance Compliance & Auditing",
      text: "Every upload is batch-stamped with a timestamp. Historical logs are always retrievable and exportable to CSV for audit and regulatory reporting.",
    },
    {
      icon: Server,
      title: "Vendor Performance Tracking",
      text: "The vendor field enables comparison across ATM service providers — identify which vendors resolve issues fastest and which need escalation.",
    },
    {
      icon: Headphones,
      title: "Better Customer Experience",
      text: "Fewer and shorter ATM outages directly improve customer satisfaction at branches, reducing complaints and protecting the bank's reputation.",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
        <h3 className="text-xl font-bold text-white">Business Value — How This Helps Your ATM Operations</h3>
        <p className="text-emerald-100 text-sm mt-1">
          Tangible outcomes the ATM Tracker delivers to maintenance teams and the broader business
        </p>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-4 bg-slate-50 rounded-xl p-5 border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm mb-1">{b.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{b.text}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-center">
          <h4 className="text-lg font-bold text-white mb-2">The Bottom Line</h4>
          <p className="text-slate-300 text-sm leading-relaxed max-w-2xl mx-auto">
            The ATM Tracker turns scattered maintenance spreadsheets into a single source of truth.
            It replaces manual reporting, guesswork, and reactive maintenance with a proactive,
            data-driven system — ultimately reducing downtime, cutting costs, and improving the
            ATM experience for both operators and customers.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
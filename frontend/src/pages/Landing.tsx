import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  Brain,
  Zap,
  Shield,
  Eye,
  TrendingUp,
  Clock,
  Database,
  Server,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import CustomCursor from '../components/landing/CustomCursor';
import AnimatedOrb from '../components/landing/AnimatedOrb';
import FeatureCard from '../components/landing/FeatureCard';
import { Button } from '../components/ui';

export default function Landing() {
  const features = [
    {
      icon: Activity,
      title: 'Unified Monitoring',
      description:
        'Frontend, backend, database, and server metrics all in one dashboard. No more context switching.',
    },
    {
      icon: Brain,
      title: 'AI Root Cause Analysis',
      description:
        'AI correlates events across your stack and tells you exactly what is wrong with evidence and suggestions.',
    },
    {
      icon: Zap,
      title: 'Easy Setup',
      description:
        'One command to install. Works with any tech stack. No code changes required.',
    },
    {
      icon: Eye,
      title: 'Real-Time Insights',
      description:
        'Get instant notifications when issues arise. Stay ahead of problems before they impact users.',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description:
        'Your data stays yours. Enterprise-grade security with SOC2 compliance.',
    },
    {
      icon: TrendingUp,
      title: 'Performance Analytics',
      description:
        'Track performance trends over time. Identify bottlenecks and optimize your application.',
    },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: 29,
      description: 'Perfect for small teams and side projects',
      features: [
        '1 project',
        'Real-time monitoring',
        'AI root cause analysis',
        '30-day data retention',
        'Email support',
      ],
    },
    {
      name: 'Professional',
      price: 99,
      description: 'For growing teams and production apps',
      features: [
        '5 projects',
        'Everything in Starter',
        '90-day data retention',
        'Priority support',
        'Custom alerts',
        'API access',
      ],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 299,
      description: 'For large teams with mission-critical apps',
      features: [
        'Unlimited projects',
        'Everything in Professional',
        'Unlimited data retention',
        '24/7 phone support',
        'Custom integrations',
        'SLA guarantee',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-dark-900 text-white overflow-x-hidden">
      <CustomCursor />

      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-40 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-pink-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              AppScope
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="px-4 py-2 text-dark-300 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link to="/signup">
              <Button variant="primary" size="md">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-24">
        <AnimatedOrb />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-primary-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                AI-Powered
              </span>
              <br />
              Application Monitoring
            </h1>
            <p className="text-xl md:text-2xl text-dark-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Stop jumping between tools. Get a single, unified view of your app's health
              with AI that explains what's wrong and why.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/signup">
                <Button variant="primary" size="lg" className="group">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="secondary" size="lg">
                  Learn More
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Floating cards */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mt-20 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {[
              { icon: Clock, label: '99.9% Uptime', value: 'Reliable' },
              { icon: Database, label: '50M+ Events', value: 'Processed' },
              { icon: Server, label: '< 100ms', value: 'Latency' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                className="p-6 bg-dark-800/50 backdrop-blur-lg rounded-xl border border-dark-700/50 hover:border-primary-500/50 transition-all duration-300 animate-float"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <stat.icon className="w-8 h-8 text-primary-500 mx-auto mb-3" />
                <div className="text-2xl font-bold text-white mb-1">{stat.label}</div>
                <div className="text-sm text-dark-400">{stat.value}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 bg-dark-800/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Everything you need in{' '}
              <span className="bg-gradient-to-r from-primary-400 to-pink-400 bg-clip-text text-transparent">
                one place
              </span>
            </h2>
            <p className="text-xl text-dark-300 max-w-2xl mx-auto">
              Monitor, analyze, and optimize your applications with powerful AI-driven insights
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Simple, transparent{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-primary-400 bg-clip-text text-transparent">
                pricing
              </span>
            </h2>
            <p className="text-xl text-dark-300 max-w-2xl mx-auto">
              Choose the plan that fits your needs. All plans include a 14-day free trial.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative p-8 rounded-2xl border transition-all duration-300 ${
                  plan.popular
                    ? 'bg-gradient-to-br from-primary-900/30 via-dark-800 to-pink-900/30 border-primary-500 scale-105 shadow-2xl shadow-primary-500/20'
                    : 'bg-dark-800/50 backdrop-blur-lg border-dark-700/50 hover:border-primary-500/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary-500 to-pink-500 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-dark-400 mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold">${plan.price}</span>
                  <span className="text-dark-400">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                      <span className="text-dark-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/signup">
                  <Button
                    variant={plan.popular ? 'primary' : 'secondary'}
                    className="w-full"
                    size="lg"
                  >
                    Start Free Trial
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-pink-900/20 to-cyan-900/20" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to simplify your debugging?
          </h2>
          <p className="text-xl text-dark-300 mb-10">
            Join developers who debug in minutes, not hours.
          </p>
          <Link to="/signup">
            <Button variant="primary" size="lg" className="group">
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-700 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-6 h-6 text-primary-500" />
                <span className="text-xl font-bold">AppScope</span>
              </div>
              <p className="text-dark-400 text-sm">
                AI-Powered Application Monitoring for modern teams
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Docs
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Status
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-dark-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-dark-500">
            <div>© 2026 AppScope. All rights reserved.</div>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-dark-400 transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-dark-400 transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-dark-400 transition-colors">
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

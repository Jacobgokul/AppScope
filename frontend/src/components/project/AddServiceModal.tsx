import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Server, Globe, Smartphone, Database, Zap, Package, RefreshCw, Plus, Check } from 'lucide-react'
import type { ServiceType } from '../../types'

interface ServiceOption {
  type: ServiceType
  name: string
  description: string
  icon: React.ReactNode
  color: string
}

interface AddServiceModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (serviceType: ServiceType, name: string, description?: string) => Promise<void>
}

export default function AddServiceModal({ isOpen, onClose, onAdd }: AddServiceModalProps) {
  const [selectedType, setSelectedType] = useState<ServiceType | null>(null)
  const [serviceName, setServiceName] = useState('')
  const [serviceDescription, setServiceDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const serviceOptions: ServiceOption[] = [
    {
      type: 'backend_api',
      name: 'Backend API',
      description: 'REST/GraphQL APIs',
      icon: <Server className="w-6 h-6" />,
      color: 'from-purple-500 to-purple-600',
    },
    {
      type: 'frontend',
      name: 'Frontend',
      description: 'Web applications',
      icon: <Globe className="w-6 h-6" />,
      color: 'from-cyan-500 to-cyan-600',
    },
    {
      type: 'custom',
      name: 'Mobile App',
      description: 'iOS / Android',
      icon: <Smartphone className="w-6 h-6" />,
      color: 'from-pink-500 to-pink-600',
    },
    {
      type: 'postgresql',
      name: 'PostgreSQL',
      description: 'SQL Database',
      icon: <Database className="w-6 h-6" />,
      color: 'from-blue-500 to-blue-600',
    },
    {
      type: 'mongodb',
      name: 'MongoDB',
      description: 'NoSQL Database',
      icon: <Database className="w-6 h-6" />,
      color: 'from-green-500 to-green-600',
    },
    {
      type: 'redis',
      name: 'Redis',
      description: 'Cache / Queue',
      icon: <Zap className="w-6 h-6" />,
      color: 'from-red-500 to-red-600',
    },
    {
      type: 'microservice',
      name: 'Microservice',
      description: 'Custom service',
      icon: <Package className="w-6 h-6" />,
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      type: 'custom',
      name: 'Worker',
      description: 'Background jobs',
      icon: <RefreshCw className="w-6 h-6" />,
      color: 'from-orange-500 to-orange-600',
    },
    {
      type: 'custom',
      name: 'Custom',
      description: 'Other service',
      icon: <Plus className="w-6 h-6" />,
      color: 'from-gray-500 to-gray-600',
    },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType || !serviceName.trim()) return

    setIsSubmitting(true)
    try {
      await onAdd(selectedType, serviceName, serviceDescription || undefined)
      handleClose()
    } catch (error) {
      console.error('Error adding service:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedType(null)
    setServiceName('')
    setServiceDescription('')
    setIsSubmitting(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-800 border border-dark-600 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-dark-700 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Add New Service</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Select the type of service you want to monitor
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center hover:bg-dark-600 transition-all"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit}>
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  {/* Service Type Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {serviceOptions.map((option) => (
                      <button
                        key={option.type + option.name}
                        type="button"
                        onClick={() => setSelectedType(option.type)}
                        className={`relative bg-dark-700/50 border-2 rounded-2xl p-4 cursor-pointer hover:border-primary-500/50 transition-all text-left ${
                          selectedType === option.type
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-dark-600'
                        }`}
                      >
                        {selectedType === option.type && (
                          <div className="absolute top-2 right-2">
                            <Check className="w-5 h-5 text-primary-400" />
                          </div>
                        )}
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center mb-3 text-white`}
                        >
                          {option.icon}
                        </div>
                        <h3 className="text-white font-semibold mb-1">{option.name}</h3>
                        <p className="text-gray-500 text-xs">{option.description}</p>
                      </button>
                    ))}
                  </div>

                  {/* Service Details Form */}
                  <div className="bg-dark-700/30 rounded-2xl p-6 border border-dark-600">
                    <h3 className="text-white font-semibold mb-4">Service Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          Service Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={serviceName}
                          onChange={(e) => setServiceName(e.target.value)}
                          placeholder="e.g., Main Frontend"
                          className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          Description (optional)
                        </label>
                        <input
                          type="text"
                          value={serviceDescription}
                          onChange={(e) => setServiceDescription(e.target.value)}
                          placeholder="e.g., React web application"
                          className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-dark-700 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-dark-700 text-gray-300 font-medium rounded-xl hover:bg-dark-600 transition-all border border-dark-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedType || !serviceName.trim() || isSubmitting}
                    className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-purple-700 transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add Service
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

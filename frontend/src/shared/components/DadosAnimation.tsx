import Lottie from 'lottie-react'
import dadosData from '@/assets/icons/animations/dados.json'


const LottieComponent = (Lottie as any).default || Lottie

interface DadosAnimationProps {
  className?: string
  style?: React.CSSProperties
  loop?: boolean
  autoplay?: boolean
}

export function DadosAnimation({ className = '', style, loop = true, autoplay = true }: DadosAnimationProps) {
  return (
    <div className={`flex items-center justify-center shrink-0 overflow-hidden ${className}`} style={style}>
      <LottieComponent
        animationData={dadosData}
        loop={loop}
        autoplay={autoplay}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

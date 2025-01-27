import { Button } from '../buttons/Button'
import { YStack } from '../core/Stacks'

export const Dropdown = ({
  options,
  onSelect,
  onCancel,
}: {
  options: any[]
  onSelect: (id: string) => string
  onCancel: () => void
}) => {
  return (
    <YStack>
      {options.map((opt: any) => (
        <Button key={opt.id} title={opt.title} onPress={() => onSelect(opt.id)} />
      ))}
    </YStack>
  )
}

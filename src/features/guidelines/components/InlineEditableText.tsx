import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Check, X, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineEditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  editable?: boolean;
  multiline?: boolean;
  elementId: string;
  hoveredElement: string | null;
  setHoveredElement: (id: string | null) => void;
}

export const InlineEditableText: React.FC<InlineEditableTextProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '',
  editable = true,
  multiline = false,
  elementId,
  hoveredElement,
  setHoveredElement,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && e.ctrlKey && multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="relative group">
        {multiline ? (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn('min-h-[100px]', className)}
            placeholder={placeholder}
          />
        ) : (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={className}
            placeholder={placeholder}
          />
        )}
        
        <div className="absolute -right-20 top-0 flex flex-col gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white"
          >
            <Check className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600 text-white"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative group transition-all duration-200 cursor-pointer',
        hoveredElement === elementId && editable ? 'ring-2 ring-primary/50 ring-offset-2 bg-primary/5' : '',
        className
      )}
      onMouseEnter={() => editable && setHoveredElement(elementId)}
      onMouseLeave={() => setHoveredElement(null)}
      onClick={() => editable && setIsEditing(true)}
    >
      {multiline ? (
        <div className="whitespace-pre-wrap">{value || placeholder}</div>
      ) : (
        <span>{value || placeholder}</span>
      )}
      
      {hoveredElement === elementId && editable && !isEditing && (
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 bg-primary text-white hover:bg-primary/80 shadow-lg"
          >
            <Edit3 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
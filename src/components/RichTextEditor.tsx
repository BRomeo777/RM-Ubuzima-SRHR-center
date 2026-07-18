import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  List,
  ListOrdered,
  Link,
  Image,
  Type,
  Palette,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  Trash2,
  Code,
  Strikethrough,
  Subscript,
  Superscript,
  RemoveFormatting,
  Plus,
  Minus,
  Highlighter
} from 'lucide-react';
import { cn } from '../utils/helpers';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  disabled?: boolean;
  id?: string;
}

// Font sizes similar to Word
const FONT_SIZES = [
  { label: '8', value: '1' },
  { label: '9', value: '1' },
  { label: '10', value: '1' },
  { label: '11', value: '2' },
  { label: '12', value: '3' },
  { label: '14', value: '3' },
  { label: '16', value: '4' },
  { label: '18', value: '4' },
  { label: '20', value: '5' },
  { label: '22', value: '5' },
  { label: '24', value: '6' },
  { label: '28', value: '6' },
  { label: '32', value: '7' },
  { label: '36', value: '7' },
  { label: '48', value: '7' },
  { label: '72', value: '7' },
];

// Font families similar to Word
const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Cambria', value: 'Cambria, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { label: 'Impact', value: 'Impact, sans-serif' },
];

// Colors similar to Word
const COLORS = [
  { label: 'Black', value: '#000000' },
  { label: 'Dark Gray', value: '#333333' },
  { label: 'Gray', value: '#666666' },
  { label: 'Light Gray', value: '#999999' },
  { label: 'White', value: '#FFFFFF' },
  { label: 'Red', value: '#FF0000' },
  { label: 'Dark Red', value: '#8B0000' },
  { label: 'Orange', value: '#FFA500' },
  { label: 'Yellow', value: '#FFFF00' },
  { label: 'Green', value: '#008000' },
  { label: 'Dark Green', value: '#006400' },
  { label: 'Blue', value: '#0000FF' },
  { label: 'Dark Blue', value: '#00008B' },
  { label: 'Purple', value: '#800080' },
  { label: 'Pink', value: '#FFC0CB' },
  { label: 'Teal', value: '#008080' },
  { label: 'Brown', value: '#8B4513' },
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  minHeight = '300px',
  maxHeight = '600px',
  disabled = false,
  id,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentBgColor, setCurrentBgColor] = useState('#FFFFFF');
  const [currentFontSize, setCurrentFontSize] = useState('3');
  const [currentFont, setCurrentFont] = useState('Arial, sans-serif');
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || `<p><br></p>`;
    }
  }, []);

  // Update active formats based on selection
  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough');
    if (document.queryCommandState('subscript')) formats.add('subscript');
    if (document.queryCommandState('superscript')) formats.add('superscript');
    if (document.queryCommandState('justifyLeft')) formats.add('justifyLeft');
    if (document.queryCommandState('justifyCenter')) formats.add('justifyCenter');
    if (document.queryCommandState('justifyRight')) formats.add('justifyRight');
    if (document.queryCommandState('justifyFull')) formats.add('justifyFull');
    if (document.queryCommandState('insertUnorderedList')) formats.add('insertUnorderedList');
    if (document.queryCommandState('insertOrderedList')) formats.add('insertOrderedList');
    
    setActiveFormats(formats);
    
    // Update current font size
    const fontSize = document.queryCommandValue('fontSize');
    if (fontSize) setCurrentFontSize(fontSize);
  }, []);

  // Handle selection change
  useEffect(() => {
    const handleSelectionChange = () => {
      updateActiveFormats();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateActiveFormats]);

  // Execute formatting command
  const execCommand = useCallback((command: string, value: string | undefined = undefined) => {
    if (disabled) return;
    
    document.execCommand(command, false, value);
    updateActiveFormats();
    
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    
    editorRef.current?.focus();
  }, [disabled, onChange, updateActiveFormats]);

  // Handle input
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Insert link
  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  // Insert image
  const insertImage = useCallback(() => {
    const url = prompt('Enter image URL:');
    if (url) {
      execCommand('insertImage', url);
    }
  }, [execCommand]);

  // Clear formatting
  const clearFormatting = useCallback(() => {
    execCommand('removeFormat');
  }, [execCommand]);

  // Toolbar button component
  const ToolbarButton = ({
    icon: Icon,
    command,
    value,
    title,
    active = false,
    onClick,
  }: {
    icon: React.ElementType;
    command?: string;
    value?: string;
    title: string;
    active?: boolean;
    onClick?: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick || (() => command && execCommand(command, value))}
      title={title}
      disabled={disabled}
      className={cn(
        'p-2 rounded-lg transition-all duration-150',
        'hover:bg-gray-100 active:scale-95',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        active && 'bg-srhr/20 text-srhr shadow-sm'
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  // Toolbar divider
  const ToolbarDivider = () => (
    <div className="w-px h-8 bg-gray-200 mx-1" />
  );

  return (
    <div className={cn(
      'border rounded-xl overflow-hidden bg-white transition-all duration-200',
      isFocused ? 'ring-2 ring-srhr/30 border-srhr' : 'border-gray-200',
      disabled && 'opacity-60 cursor-not-allowed'
    )}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-3 bg-gradient-to-b from-gray-50 to-gray-100 border-b border-gray-200">
        {/* Undo/Redo */}
        <ToolbarButton icon={Undo} command="undo" title="Undo (Ctrl+Z)" />
        <ToolbarButton icon={Redo} command="redo" title="Redo (Ctrl+Y)" />
        
        <ToolbarDivider />
        
        {/* Font Family Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFontDropdown(!showFontDropdown)}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors min-w-[120px]"
            disabled={disabled}
          >
            <span className="truncate">{FONT_FAMILIES.find(f => f.value === currentFont)?.label || 'Font'}</span>
          </button>
          {showFontDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {FONT_FAMILIES.map((font) => (
                <button
                  key={font.value}
                  type="button"
                  onClick={() => {
                    execCommand('fontName', font.value);
                    setCurrentFont(font.value);
                    setShowFontDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Font Size Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSizeDropdown(!showSizeDropdown)}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors min-w-[60px]"
            disabled={disabled}
          >
            <span>{FONT_SIZES.find(s => s.value === currentFontSize)?.label || '12'}</span>
          </button>
          {showSizeDropdown && (
            <div className="absolute top-full left-0 mt-1 w-20 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {FONT_SIZES.map((size, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    execCommand('fontSize', size.value);
                    setCurrentFontSize(size.value);
                    setShowSizeDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                >
                  {size.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <ToolbarDivider />

        {/* Text Style */}
        <ToolbarButton 
          icon={Bold} 
          command="bold" 
          title="Bold (Ctrl+B)" 
          active={activeFormats.has('bold')} 
        />
        <ToolbarButton 
          icon={Italic} 
          command="italic" 
          title="Italic (Ctrl+I)" 
          active={activeFormats.has('italic')} 
        />
        <ToolbarButton 
          icon={Underline} 
          command="underline" 
          title="Underline (Ctrl+U)" 
          active={activeFormats.has('underline')} 
        />
        <ToolbarButton 
          icon={Strikethrough} 
          command="strikeThrough" 
          title="Strikethrough" 
          active={activeFormats.has('strikeThrough')} 
        />

        <ToolbarDivider />

        {/* Text Color */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Text Color"
            disabled={disabled}
          >
            <Type className="w-4 h-4" style={{ color: currentColor }} />
            <div 
              className="w-3 h-3 rounded-sm border border-gray-300" 
              style={{ backgroundColor: currentColor }}
            />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="grid grid-cols-4 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => {
                      execCommand('foreColor', color.value);
                      setCurrentColor(color.value);
                      setShowColorPicker(false);
                    }}
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Background Color */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowBgColorPicker(!showBgColorPicker)}
            className="flex items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Highlight Color"
            disabled={disabled}
          >
            <Highlighter className="w-4 h-4" />
            <div 
              className="w-3 h-3 rounded-sm border border-gray-300" 
              style={{ backgroundColor: currentBgColor }}
            />
          </button>
          {showBgColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="grid grid-cols-4 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => {
                      execCommand('hiliteColor', color.value);
                      setCurrentBgColor(color.value);
                      setShowBgColorPicker(false);
                    }}
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <ToolbarDivider />

        {/* Subscript/Superscript */}
        <ToolbarButton 
          icon={Subscript} 
          command="subscript" 
          title="Subscript" 
          active={activeFormats.has('subscript')} 
        />
        <ToolbarButton 
          icon={Superscript} 
          command="superscript" 
          title="Superscript" 
          active={activeFormats.has('superscript')} 
        />

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton icon={Heading1} command="formatBlock" value="H1" title="Heading 1" />
        <ToolbarButton icon={Heading2} command="formatBlock" value="H2" title="Heading 2" />
        <ToolbarButton icon={Heading3} command="formatBlock" value="H3" title="Heading 3" />
        <ToolbarButton icon={Quote} command="formatBlock" value="BLOCKQUOTE" title="Quote" />

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton 
          icon={AlignLeft} 
          command="justifyLeft" 
          title="Align Left" 
          active={activeFormats.has('justifyLeft')} 
        />
        <ToolbarButton 
          icon={AlignCenter} 
          command="justifyCenter" 
          title="Align Center" 
          active={activeFormats.has('justifyCenter')} 
        />
        <ToolbarButton 
          icon={AlignRight} 
          command="justifyRight" 
          title="Align Right" 
          active={activeFormats.has('justifyRight')} 
        />
        <ToolbarButton 
          icon={AlignJustify} 
          command="justifyFull" 
          title="Justify" 
          active={activeFormats.has('justifyFull')} 
        />

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton 
          icon={List} 
          command="insertUnorderedList" 
          title="Bullet List" 
          active={activeFormats.has('insertUnorderedList')} 
        />
        <ToolbarButton 
          icon={ListOrdered} 
          command="insertOrderedList" 
          title="Numbered List" 
          active={activeFormats.has('insertOrderedList')} 
        />

        <ToolbarDivider />

        {/* Link & Image */}
        <ToolbarButton icon={Link} title="Insert Link" onClick={insertLink} />
        <ToolbarButton icon={Image} title="Insert Image" onClick={insertImage} />

        <ToolbarDivider />

        {/* Clear Formatting */}
        <ToolbarButton icon={RemoveFormatting} title="Clear Formatting" onClick={clearFormatting} />
      </div>

      {/* Editor Area */}
      <div className="relative">
        <div
          ref={editorRef}
          id={id}
          contentEditable={!disabled}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            'w-full p-4 outline-none prose prose-sm max-w-none',
            'focus:ring-0',
            disabled && 'cursor-not-allowed'
          )}
          style={{ 
            minHeight, 
            maxHeight,
            overflowY: 'auto',
          }}
          data-placeholder={placeholder}
        />
        
        {/* Placeholder */}
        {(!value || value === '<p><br></p>' || value === '<p></p>') && !isFocused && (
          <div className="absolute top-4 left-4 text-gray-400 pointer-events-none select-none">
            {placeholder}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <span>Words: {(value?.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(w => w.length > 0).length) || 0}</span>
        <span>Characters: {(value?.replace(/<[^>]*>/g, '').length) || 0}</span>
      </div>
    </div>
  );
}

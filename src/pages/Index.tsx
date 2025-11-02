import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Icon from '@/components/ui/icon';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type Tool = 'select' | 'rectangle' | 'circle' | 'text' | 'sticky' | 'line' | 'arrow' | 'pen' | 'eraser' | 'image' | 'diamond' | 'triangle';

interface CanvasObject {
  id: string;
  type: Tool;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  points?: { x: number; y: number }[];
}

interface Template {
  id: string;
  name: string;
  objects: CanvasObject[];
}

const COLORS = ['#8B5CF6', '#0EA5E9', '#F97316', '#10B981', '#F59E0B', '#EC4899'];

const API_URL = 'https://functions.poehali.dev/162b3525-6c8b-4235-b923-aa2e333cf260';

const Index = () => {
  const { toast } = useToast();
  const [tool, setTool] = useState<Tool>('select');
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [history, setHistory] = useState<CanvasObject[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [editingText, setEditingText] = useState<string | null>(null);
  const [drawingLine, setDrawingLine] = useState<{ x: number; y: number } | null>(null);
  const [penPoints, setPenPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawingPen, setIsDrawingPen] = useState(false);
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addToHistory = (newObjects: CanvasObject[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newObjects);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (tool === 'select') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - pan.x) / (zoom / 100);
    const y = (e.clientY - rect.top - pan.y) / (zoom / 100);

    if (tool === 'line' || tool === 'arrow') {
      setDrawingLine({ x, y });
      return;
    }

    if (tool === 'pen') {
      setIsDrawingPen(true);
      setPenPoints([{ x, y }]);
      return;
    }

    if (tool === 'eraser') {
      const clickedObj = objects.find(obj => {
        if (obj.x <= x && x <= (obj.x + (obj.width || 0)) && obj.y <= y && y <= (obj.y + (obj.height || 0))) {
          return true;
        }
        return false;
      });
      if (clickedObj) {
        const newObjects = objects.filter(o => o.id !== clickedObj.id);
        setObjects(newObjects);
        addToHistory(newObjects);
      }
      return;
    }

    const newObject: CanvasObject = {
      id: Date.now().toString(),
      type: tool,
      x,
      y,
      width: tool === 'rectangle' || tool === 'sticky' || tool === 'diamond' ? 150 : tool === 'triangle' ? 120 : 100,
      height: tool === 'rectangle' || tool === 'sticky' || tool === 'diamond' || tool === 'triangle' ? 100 : 100,
      text: tool === 'text' || tool === 'sticky' ? 'Double click to edit' : '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };

    const newObjects = [...objects, newObject];
    setObjects(newObjects);
    addToHistory(newObjects);
    setTool('select');
  };

  const handleObjectMouseDown = (e: React.MouseEvent, objId: string) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    
    setSelectedObject(objId);
    const obj = objects.find(o => o.id === objId);
    if (!obj) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const offsetX = (e.clientX - rect.left - pan.x) / (zoom / 100) - obj.x;
    const offsetY = (e.clientY - rect.top - pan.y) / (zoom / 100) - obj.y;
    
    setDragging({ id: objId, offsetX, offsetY });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (dragging) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - pan.x) / (zoom / 100) - dragging.offsetX;
      const y = (e.clientY - rect.top - pan.y) / (zoom / 100) - dragging.offsetY;

      setObjects(objects.map(obj => 
        obj.id === dragging.id ? { ...obj, x, y } : obj
      ));
    }

    if (isDrawingPen) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - pan.x) / (zoom / 100);
      const y = (e.clientY - rect.top - pan.y) / (zoom / 100);
      setPenPoints([...penPoints, { x, y }]);
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (dragging) {
      addToHistory(objects);
      setDragging(null);
    }
    setIsPanning(false);

    if (drawingLine) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x2 = (e.clientX - rect.left - pan.x) / (zoom / 100);
      const y2 = (e.clientY - rect.top - pan.y) / (zoom / 100);

      const newObject: CanvasObject = {
        id: Date.now().toString(),
        type: tool as 'line' | 'arrow',
        x: drawingLine.x,
        y: drawingLine.y,
        x2,
        y2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };

      const newObjects = [...objects, newObject];
      setObjects(newObjects);
      addToHistory(newObjects);
      setDrawingLine(null);
      setTool('select');
    }

    if (isDrawingPen && penPoints.length > 1) {
      const newObject: CanvasObject = {
        id: Date.now().toString(),
        type: 'pen',
        x: Math.min(...penPoints.map(p => p.x)),
        y: Math.min(...penPoints.map(p => p.y)),
        points: penPoints,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
      const newObjects = [...objects, newObject];
      setObjects(newObjects);
      addToHistory(newObjects);
      setPenPoints([]);
      setIsDrawingPen(false);
      setTool('select');
    }
  };

  const handleZoom = (delta: number) => {
    setZoom(Math.max(25, Math.min(200, zoom + delta)));
  };

  const deleteSelected = () => {
    if (!selectedObject) return;
    const newObjects = objects.filter(obj => obj.id !== selectedObject);
    setObjects(newObjects);
    addToHistory(newObjects);
    setSelectedObject(null);
    toast({ title: 'Object deleted' });
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setObjects(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setObjects(history[historyIndex + 1]);
    }
  };

  const saveProject = async () => {
    try {
      let projectId = currentProjectId;
      
      if (!projectId) {
        const createRes = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_project', name: 'My Canvas Project' })
        });
        const data = await createRes.json();
        projectId = data.project_id;
        setCurrentProjectId(projectId);
      }

      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_objects', project_id: projectId, objects })
      });
      
      toast({ title: 'Project saved successfully!' });
    } catch (error) {
      toast({ title: 'Failed to save project', variant: 'destructive' });
    }
  };

  const saveAsTemplate = () => {
    const name = prompt('Enter template name:');
    if (!name) return;
    const newTemplate: Template = {
      id: Date.now().toString(),
      name,
      objects: JSON.parse(JSON.stringify(objects)),
    };
    const newTemplates = [...userTemplates, newTemplate];
    setUserTemplates(newTemplates);
    localStorage.setItem('canvas-templates', JSON.stringify(newTemplates));
    toast({ title: 'Template saved!' });
  };

  const loadTemplate = (template: Template) => {
    const newObjects = JSON.parse(JSON.stringify(template.objects));
    setObjects(newObjects);
    addToHistory(newObjects);
    toast({ title: `Template "${template.name}" loaded!` });
  };

  useEffect(() => {
    const saved = localStorage.getItem('canvas-templates');
    if (saved) {
      setUserTemplates(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        handleZoom(e.deltaY > 0 ? -10 : 10);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObject) {
        e.preventDefault();
        deleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveProject();
      }
    };

    const canvas = canvasRef.current;
    canvas?.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      canvas?.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [zoom, selectedObject, historyIndex, objects, currentProjectId]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#F8F9FA]">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">Canvas Board</h1>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Icon name="Folder" size={16} />
                Projects
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Projects</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                <Card className="p-4 cursor-pointer hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                      <Icon name="Layers" size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Product Roadmap</h3>
                      <p className="text-sm text-muted-foreground">Updated 2h ago</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 cursor-pointer hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center">
                      <Icon name="Users" size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Team Brainstorm</h3>
                      <p className="text-sm text-muted-foreground">Updated 1d ago</p>
                    </div>
                  </div>
                </Card>
              </div>
            </SheetContent>
          </Sheet>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Icon name="LayoutTemplate" size={16} />
                Templates
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Templates</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Built-in Templates</h3>
                  <div className="space-y-2">
                    {['Brainstorming', 'User Flow', 'Wireframe', 'Mind Map'].map((template) => (
                      <Card key={template} className="p-4 cursor-pointer hover:bg-accent transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-12 rounded bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20" />
                          <h3 className="font-medium">{template}</h3>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">My Templates</h3>
                    <Button size="sm" onClick={saveAsTemplate}>
                      <Icon name="Plus" size={14} className="mr-1" />
                      Save Current
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {userTemplates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No templates yet</p>
                    ) : (
                      userTemplates.map((template) => (
                        <Card key={template.id} className="p-4 cursor-pointer hover:bg-accent transition-colors" onClick={() => loadTemplate(template)}>
                          <div className="flex items-center gap-3">
                            <Icon name="FileText" size={20} className="text-primary" />
                            <h3 className="font-medium">{template.name}</h3>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Icon name="Users2" size={16} />
                Team
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Team Members</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-3">
                {[
                  { name: 'Anna Smith', role: 'Designer', avatar: 'AS' },
                  { name: 'Mike Johnson', role: 'Developer', avatar: 'MJ' },
                  { name: 'Sarah Williams', role: 'Product Manager', avatar: 'SW' },
                ].map((member) => (
                  <div key={member.name} className="flex items-center gap-3 p-2 rounded hover:bg-accent">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-white">{member.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <Button onClick={saveProject} className="gap-2">
            <Icon name="Save" size={16} />
            Save
          </Button>

          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0}>
                  <Icon name="Undo" size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1}>
                  <Icon name="Redo" size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </div>

          <Avatar className="cursor-pointer">
            <AvatarFallback className="bg-primary text-white">YP</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === 'select' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setTool('select')}
              >
                <Icon name="MousePointer2" size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Select</TooltipContent>
          </Tooltip>

          <Separator className="w-8" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === 'sticky' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setTool('sticky')}
              >
                <Icon name="StickyNote" size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sticky Note</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === 'rectangle' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setTool('rectangle')}
              >
                <Icon name="Square" size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Rectangle</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === 'circle' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setTool('circle')}
              >
                <Icon name="Circle" size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Circle</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === 'text' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setTool('text')}
              >
                <Icon name="Type" size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Text</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === 'diamond' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setTool('diamond')}
              >
                <Icon name="Diamond" size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Diamond</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === 'triangle' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setTool('triangle')}
              >
                <Icon name="Triangle" size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Triangle</TooltipContent>
          </Tooltip>

          <Separator className="w-8" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === 'line' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setTool('line')}
              >
                <Icon name="Minus" size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Line</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === 'arrow' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setTool('arrow')}
              >
                <Icon name="ArrowRight" size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Arrow</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === 'pen' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setTool('pen')}
              >
                <Icon name="Pen" size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Pen</TooltipContent>
          </Tooltip>

          <Separator className="w-8" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === 'eraser' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setTool('eraser')}
              >
                <Icon name="Eraser" size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Eraser</TooltipContent>
          </Tooltip>

          <div className="flex-1" />

          <Separator className="w-8" />

          <Sheet>
            <SheetTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Icon name="HelpCircle" size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Help</TooltipContent>
              </Tooltip>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Help & Shortcuts</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Tools</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Select:</strong> Click and drag objects</p>
                    <p><strong>Shapes:</strong> Click to place rectangle, circle, diamond, triangle</p>
                    <p><strong>Sticky Note:</strong> Add text notes</p>
                    <p><strong>Text:</strong> Add plain text</p>
                    <p><strong>Line/Arrow:</strong> Click start, drag to end point</p>
                    <p><strong>Pen:</strong> Draw freehand by clicking and dragging</p>
                    <p><strong>Eraser:</strong> Click objects to remove them</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Keyboard Shortcuts</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Undo</span>
                      <code className="bg-muted px-2 py-1 rounded">Ctrl+Z</code>
                    </div>
                    <div className="flex justify-between">
                      <span>Redo</span>
                      <code className="bg-muted px-2 py-1 rounded">Ctrl+Y</code>
                    </div>
                    <div className="flex justify-between">
                      <span>Delete</span>
                      <code className="bg-muted px-2 py-1 rounded">Del/Backspace</code>
                    </div>
                    <div className="flex justify-between">
                      <span>Save</span>
                      <code className="bg-muted px-2 py-1 rounded">Ctrl+S</code>
                    </div>
                    <div className="flex justify-between">
                      <span>Zoom</span>
                      <code className="bg-muted px-2 py-1 rounded">Ctrl+Scroll</code>
                    </div>
                    <div className="flex justify-between">
                      <span>Pan</span>
                      <code className="bg-muted px-2 py-1 rounded">Alt+Drag</code>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Editing</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Double-click</strong> text or sticky note to edit</p>
                    <p><strong>Click</strong> object to select it</p>
                    <p><strong>Drag</strong> selected object to move</p>
                    <p><strong>Hover</strong> selected object to see delete button</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Templates</h3>
                  <div className="space-y-2 text-sm">
                    <p>Save your current canvas as a template from the Templates panel</p>
                    <p>Load saved templates to quickly start new projects</p>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </aside>

        <main className="flex-1 relative overflow-hidden">
          <div
            ref={canvasRef}
            className="absolute inset-0 cursor-crosshair"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              cursor: isPanning ? 'grabbing' : tool === 'select' ? 'default' : 'crosshair',
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
                transformOrigin: '0 0',
              }}
            >
              {objects.map((obj) => {
                if (obj.type === 'line' || obj.type === 'arrow') {
                  return (
                    <svg
                      key={obj.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        overflow: 'visible',
                      }}
                    >
                      <defs>
                        <marker
                          id={`arrowhead-${obj.id}`}
                          markerWidth="10"
                          markerHeight="10"
                          refX="9"
                          refY="3"
                          orient="auto"
                        >
                          <polygon points="0 0, 10 3, 0 6" fill={obj.color} />
                        </marker>
                      </defs>
                      <line
                        x1={obj.x}
                        y1={obj.y}
                        x2={obj.x2}
                        y2={obj.y2}
                        stroke={obj.color}
                        strokeWidth="3"
                        markerEnd={obj.type === 'arrow' ? `url(#arrowhead-${obj.id})` : undefined}
                      />
                    </svg>
                  );
                }

                if (obj.type === 'pen' && obj.points) {
                  const pathData = obj.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  return (
                    <svg
                      key={obj.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        overflow: 'visible',
                      }}
                    >
                      <path d={pathData} stroke={obj.color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  );
                }

                if (obj.type === 'diamond') {
                  return (
                    <div
                      key={obj.id}
                      className="absolute shadow-lg transition-all cursor-move group"
                      onMouseDown={(e) => handleObjectMouseDown(e, obj.id)}
                      onDoubleClick={() => (obj.type === 'text' || obj.type === 'sticky') && setEditingText(obj.id)}
                      style={{
                        left: obj.x,
                        top: obj.y,
                        width: obj.width,
                        height: obj.height,
                        transform: 'rotate(45deg)',
                        backgroundColor: obj.color,
                        border: selectedObject === obj.id ? '3px solid #8B5CF6' : '2px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      {selectedObject === obj.id && (
                        <button
                          className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          style={{ transform: 'rotate(-45deg)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSelected();
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                }

                if (obj.type === 'triangle') {
                  return (
                    <svg
                      key={obj.id}
                      className="absolute cursor-move group"
                      onMouseDown={(e) => handleObjectMouseDown(e, obj.id)}
                      style={{
                        left: obj.x,
                        top: obj.y,
                        width: obj.width,
                        height: obj.height,
                      }}
                    >
                      <polygon
                        points={`${(obj.width || 0) / 2},0 ${obj.width},${obj.height} 0,${obj.height}`}
                        fill={obj.color}
                        stroke={selectedObject === obj.id ? '#8B5CF6' : 'rgba(255,255,255,0.3)'}
                        strokeWidth={selectedObject === obj.id ? '3' : '2'}
                      />
                      {selectedObject === obj.id && (
                        <foreignObject x="0" y="-30" width="100" height="30">
                          <button
                            className="w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSelected();
                            }}
                          >
                            ×
                          </button>
                        </foreignObject>
                      )}
                    </svg>
                  );
                }

                return (
                  <div
                    key={obj.id}
                    className="absolute shadow-lg transition-all cursor-move group"
                    onMouseDown={(e) => handleObjectMouseDown(e, obj.id)}
                    onDoubleClick={() => (obj.type === 'text' || obj.type === 'sticky') && setEditingText(obj.id)}
                    style={{
                      left: obj.x,
                      top: obj.y,
                      width: obj.width,
                      height: obj.height,
                      backgroundColor: obj.type === 'text' ? 'transparent' : obj.color,
                      borderRadius: obj.type === 'circle' ? '50%' : obj.type === 'sticky' ? '2px' : '4px',
                      border: selectedObject === obj.id 
                        ? '3px solid #8B5CF6' 
                        : obj.type === 'text' ? 'none' : '2px solid rgba(255,255,255,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: obj.type === 'text' ? '#1F2937' : '#ffffff',
                      padding: '8px',
                      fontSize: '14px',
                      fontWeight: obj.type === 'sticky' ? '500' : '400',
                    }}
                  >
                    {editingText === obj.id ? (
                      <input
                        autoFocus
                        className="w-full h-full bg-transparent text-center outline-none"
                        value={obj.text || ''}
                        onChange={(e) => {
                          setObjects(objects.map(o => 
                            o.id === obj.id ? { ...o, text: e.target.value } : o
                          ));
                        }}
                        onBlur={() => {
                          setEditingText(null);
                          addToHistory(objects);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingText(null);
                            addToHistory(objects);
                          }
                        }}
                      />
                    ) : (
                      obj.text && obj.text
                    )}
                    {selectedObject === obj.id && (
                      <button
                        className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSelected();
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => handleZoom(-10)}>
              <Icon name="Minus" size={16} />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center">{zoom}%</span>
            <Button variant="ghost" size="icon" onClick={() => handleZoom(10)}>
              <Icon name="Plus" size={16} />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" size="icon" onClick={() => { setZoom(100); setPan({ x: 0, y: 0 }); }}>
              <Icon name="Maximize2" size={16} />
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
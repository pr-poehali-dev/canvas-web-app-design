import { useState, useRef, useEffect } from 'react';
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

type Tool = 'select' | 'rectangle' | 'circle' | 'text' | 'sticky' | 'line' | 'arrow';

interface CanvasObject {
  id: string;
  type: Tool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
}

const COLORS = ['#8B5CF6', '#0EA5E9', '#F97316', '#10B981', '#F59E0B', '#EC4899'];

const Index = () => {
  const [tool, setTool] = useState<Tool>('select');
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

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

    const newObject: CanvasObject = {
      id: Date.now().toString(),
      type: tool,
      x,
      y,
      width: tool === 'rectangle' || tool === 'sticky' ? 150 : 100,
      height: tool === 'rectangle' || tool === 'sticky' ? 100 : 100,
      text: tool === 'text' || tool === 'sticky' ? 'Double click to edit' : '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };

    setObjects([...objects, newObject]);
    setTool('select');
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  const handleZoom = (delta: number) => {
    setZoom(Math.max(25, Math.min(200, zoom + delta)));
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        handleZoom(e.deltaY > 0 ? -10 : 10);
      }
    };

    const canvas = canvasRef.current;
    canvas?.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas?.removeEventListener('wheel', handleWheel);
  }, [zoom]);

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
              <div className="mt-6 space-y-2">
                {['Brainstorming', 'User Flow', 'Wireframe', 'Mind Map'].map((template) => (
                  <Card key={template} className="p-4 cursor-pointer hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-12 rounded bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20" />
                      <h3 className="font-medium">{template}</h3>
                    </div>
                  </Card>
                ))}
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

          <Button className="gap-2">
            <Icon name="Share2" size={16} />
            Share
          </Button>

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

          <div className="flex-1" />

          <Separator className="w-8" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Icon name="Settings" size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
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
              {objects.map((obj) => (
                <div
                  key={obj.id}
                  className="absolute shadow-lg transition-transform hover:scale-105 cursor-pointer"
                  style={{
                    left: obj.x,
                    top: obj.y,
                    width: obj.width,
                    height: obj.height,
                    backgroundColor: obj.type === 'text' ? 'transparent' : obj.color,
                    borderRadius: obj.type === 'circle' ? '50%' : obj.type === 'sticky' ? '2px' : '4px',
                    border: obj.type === 'text' ? 'none' : '2px solid rgba(255,255,255,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: obj.type === 'text' ? '#1F2937' : '#ffffff',
                    padding: '8px',
                    fontSize: '14px',
                    fontWeight: obj.type === 'sticky' ? '500' : '400',
                  }}
                >
                  {obj.text && obj.text}
                </div>
              ))}
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

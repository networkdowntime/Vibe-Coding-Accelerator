import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, combineLatest, startWith, debounceTime, distinctUntilChanged } from 'rxjs';
import { AgentService, Agent, TechStack } from '../../services/agent.service';

@Component({
  selector: 'app-agent-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agent-select.component.html',
  styleUrls: ['./agent-select.component.scss']
})
export class AgentSelectComponent implements OnInit, OnDestroy {
  @Input() projectName: string = '';
  @Output() agentChanged = new EventEmitter<Agent | null>();
  @Output() techStackChanged = new EventEmitter<string[]>();
  @Output() error = new EventEmitter<string>();

  private destroy$ = new Subject<void>();

  // Agent selection
  availableAgents: Agent[] = [];
  selectedAgent: Agent | null = null;
  isLoadingAgents = false;

  // Tech stack selection
  availableTechStacks: TechStack[] = [];
  selectedTechStacks: string[] = [];
  isLoadingTechStacks = false;
  
  // Autocomplete
  techStackInput = '';
  filteredTechStacks: TechStack[] = [];
  showAutocomplete = false;

  constructor(private agentService: AgentService) {}

  ngOnInit(): void {
    this.loadAgents();
    this.loadProjectTechStack();
    this.setupTechStackFiltering();
    this.setupAgentServiceSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load available AI agents
   */
  private loadAgents(): void {
    this.isLoadingAgents = true;
    this.agentService.getAgents()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (agents) => {
          this.availableAgents = agents;
          this.isLoadingAgents = false;
        },
        error: (error) => {
          console.error('Error loading agents:', error);
          this.error.emit('Failed to load AI agents');
          this.isLoadingAgents = false;
        }
      });
  }

  /**
   * Load project's current tech stack
   */
  private loadProjectTechStack(): void {
    if (!this.projectName) return;

    this.agentService.getProjectTechStack(this.projectName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (techStack) => {
          this.selectedTechStacks = techStack;
          this.agentService.setSelectedTechStack(techStack);
          this.techStackChanged.emit(techStack);
        },
        error: (error) => {
          console.error('Error loading project tech stack:', error);
          this.error.emit('Failed to load project tech stack');
        }
      });
  }

  /**
   * Handle agent selection change
   */
  onAgentChange(): void {
    this.agentService.setSelectedAgent(this.selectedAgent);
    this.agentChanged.emit(this.selectedAgent);
    
    if (this.selectedAgent) {
      this.loadTechStacks(this.selectedAgent.id);
    } else {
      this.availableTechStacks = [];
      this.filteredTechStacks = [];
    }
  }

  /**
   * Load tech stacks for selected agent
   */
  private loadTechStacks(agentId: string): void {
    this.isLoadingTechStacks = true;
    this.agentService.getTechStacks(agentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (techStacks) => {
          this.availableTechStacks = techStacks;
          this.filterTechStacks();
          this.isLoadingTechStacks = false;
        },
        error: (error) => {
          console.error('Error loading tech stacks:', error);
          this.error.emit('Failed to load tech stacks');
          this.isLoadingTechStacks = false;
        }
      });
  }

  /**
   * Setup tech stack filtering for autocomplete
   */
  private setupTechStackFiltering(): void {
    // Create observable for input changes
    const inputSubject = new Subject<string>();
    
    inputSubject.pipe(
      startWith(''),
      debounceTime(200),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.filterTechStacks();
    });

    // Emit input changes
    this.onTechStackInputChange = (value: string) => {
      this.techStackInput = value;
      inputSubject.next(value);
    };
  }

  /**
   * Filter tech stacks based on input
   */
  private filterTechStacks(): void {
    const query = this.techStackInput.toLowerCase();
    this.filteredTechStacks = this.availableTechStacks.filter(stack =>
      stack.displayName.toLowerCase().includes(query) &&
      !this.selectedTechStacks.includes(stack.displayName)
    );
    this.showAutocomplete = this.techStackInput.length > 0 && this.filteredTechStacks.length > 0;
  }

  /**
   * Handle tech stack input changes
   */
  onTechStackInputChange: (value: string) => void = () => {};

  /**
   * Handle input focus
   */
  onTechStackInputFocus(): void {
    this.filterTechStacks();
    this.showAutocomplete = this.filteredTechStacks.length > 0;
  }

  /**
   * Handle input blur (with delay to allow clicking on suggestions)
   */
  onTechStackInputBlur(): void {
    setTimeout(() => {
      this.showAutocomplete = false;
    }, 200);
  }

  /**
   * Add tech stack item
   */
  addTechStack(techStack: TechStack): void {
    if (!this.selectedTechStacks.includes(techStack.displayName)) {
      this.selectedTechStacks.push(techStack.displayName);
      this.updateTechStack();
    }
    this.techStackInput = '';
    this.filterTechStacks();
  }

  /**
   * Remove tech stack item
   */
  removeTechStack(item: string): void {
    this.selectedTechStacks = this.selectedTechStacks.filter(stack => stack !== item);
    this.updateTechStack();
    this.filterTechStacks();
  }

  /**
   * Update tech stack selection
   */
  private updateTechStack(): void {
    this.agentService.setSelectedTechStack(this.selectedTechStacks);
    this.techStackChanged.emit(this.selectedTechStacks);
    
    if (this.projectName) {
      this.saveTechStack();
    }
  }

  /**
   * Save tech stack to project
   */
  private saveTechStack(): void {
    this.agentService.saveTechStack(this.projectName, this.selectedTechStacks)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Tech stack saved:', response.message);
        },
        error: (error) => {
          console.error('Error saving tech stack:', error);
          this.error.emit('Failed to save tech stack');
        }
      });
  }

  /**
   * Setup subscriptions to agent service state
   */
  private setupAgentServiceSubscriptions(): void {
    // Subscribe to selected agent changes
    this.agentService.selectedAgent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(agent => {
        if (agent && agent !== this.selectedAgent) {
          this.selectedAgent = agent;
        }
      });

    // Subscribe to selected tech stack changes
    this.agentService.selectedTechStack$
      .pipe(takeUntil(this.destroy$))
      .subscribe(techStack => {
        if (JSON.stringify(techStack) !== JSON.stringify(this.selectedTechStacks)) {
          this.selectedTechStacks = [...techStack];
        }
      });
  }

  /**
   * Handle Enter key in tech stack input
   */
  onTechStackInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.filteredTechStacks.length > 0) {
        this.addTechStack(this.filteredTechStacks[0]);
      }
    } else if (event.key === 'Escape') {
      this.showAutocomplete = false;
      this.techStackInput = '';
    }
  }
}

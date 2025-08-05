import { Component, OnInit, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AgentService, Agent, TechStackOption, SaveSelectionRequest } from '../../services/agent.service';

@Component({
  selector: 'app-agent-select',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTabsModule,
    MatExpansionModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="agent-select-container">
      <mat-card class="selection-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>smart_toy</mat-icon>
            AI Agent Configuration
          </mat-card-title>
          <mat-card-subtitle>
            Select AI agents and configure tech stack for your project
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (agentService.loading()) {
            <div class="loading-container">
              <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
              <p>Loading configuration options...</p>
            </div>
          } @else {
            <form [formGroup]="selectionForm" class="selection-form">
              
              <mat-tab-group mat-stretch-tabs="false">
                
                <!-- AI Agents Tab -->
                <mat-tab label="AI Agents">
                  <div class="tab-content">
                    <p class="section-description">
                      Choose AI agents that will assist with your project development.
                      Each agent has specific capabilities and can help with different aspects of your workflow.
                    </p>

                    @if (agentCategories().length > 0) {
                      @for (category of agentCategories(); track category) {
                        <mat-expansion-panel class="category-panel">
                          <mat-expansion-panel-header>
                            <mat-panel-title>{{ category | titlecase }}</mat-panel-title>
                            <mat-panel-description>
                              {{ getAgentsByCategory(category).length || 0 }} available agents
                            </mat-panel-description>
                          </mat-expansion-panel-header>
                          
                          <div class="agents-grid">
                            @for (agent of getAgentsByCategory(category); track agent.id) {
                              <div class="agent-card" 
                                   [class.selected]="isAgentSelected(agent.id)"
                                   (click)="toggleAgentSelection(agent.id)">
                                <div class="agent-header">
                                  <h4>{{ agent.name }}</h4>
                                  <mat-icon class="status-icon" 
                                           [attr.title]="agent.status">
                                    @switch (agent.status) {
                                      @case ('active') { check_circle }
                                      @case ('beta') { beta }
                                      @case ('deprecated') { warning }
                                    }
                                  </mat-icon>
                                </div>
                                <p class="agent-description">{{ agent.description }}</p>
                                @if (agent.capabilities && agent.capabilities.length > 0) {
                                  <div class="capabilities">
                                    @for (capability of agent.capabilities; track capability) {
                                      <mat-chip-option class="capability-chip">
                                        {{ capability }}
                                      </mat-chip-option>
                                    }
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        </mat-expansion-panel>
                      }
                    } @else {
                      <div class="empty-state">
                        <mat-icon>info</mat-icon>
                        <p>No agents available. Please check your server configuration.</p>
                      </div>
                    }
                  </div>
                </mat-tab>

                <!-- Tech Stack Tab -->
                <mat-tab label="Tech Stack">
                  <div class="tab-content">
                    <p class="section-description">
                      Configure the technology stack and coding standards for your project.
                      These settings will guide the AI agents in generating appropriate code.
                    </p>

                    <!-- Search and Filter -->
                    <div class="filter-section">
                      <mat-form-field appearance="outline" class="search-field">
                        <mat-label>Search tech stack options</mat-label>
                        <input matInput 
                               [(ngModel)]="techStackSearch" 
                               [ngModelOptions]="{standalone: true}"
                               (ngModelChange)="onTechStackSearch()"
                               placeholder="e.g., JavaScript, React, security...">
                        <mat-icon matPrefix>search</mat-icon>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="category-filter">
                        <mat-label>Filter by category</mat-label>
                        <mat-select [(ngModel)]="selectedTechStackCategory" 
                                   [ngModelOptions]="{standalone: true}"
                                   (selectionChange)="onCategoryFilter()">
                          <mat-option value="">All Categories</mat-option>
                          @for (category of techStackCategories(); track category) {
                            <mat-option [value]="category">{{ category | titlecase }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    </div>

                    <!-- Tech Stack Options -->
                    @if (filteredTechStackOptions().length > 0) {
                      <div class="tech-stack-grid">
                        @for (option of filteredTechStackOptions(); track option.id) {
                          <div class="tech-stack-card"
                               [class.selected]="isTechStackSelected(option.id)"
                               (click)="toggleTechStackSelection(option.id)">
                            <div class="tech-stack-header">
                              <h4>{{ option.name }}</h4>
                              <span class="category-badge">{{ option.category }}</span>
                            </div>
                            <p class="tech-stack-description">{{ option.description }}</p>
                            <div class="apply-to">
                              <strong>Applies to:</strong> {{ option.applyTo }}
                            </div>
                            @if (option.tags && option.tags.length > 0) {
                              <div class="tags">
                                @for (tag of option.tags; track tag) {
                                  <span class="tag">{{ tag }}</span>
                                }
                              </div>
                            }
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="empty-state">
                        <mat-icon>search_off</mat-icon>
                        <p>No tech stack options found matching your criteria.</p>
                      </div>
                    }
                  </div>
                </mat-tab>

                <!-- Preferences Tab -->
                <mat-tab label="Preferences">
                  <div class="tab-content">
                    <p class="section-description">
                      Set additional preferences to customize how AI agents work with your project.
                    </p>

                    <div class="preferences-form">
                      <mat-form-field appearance="outline">
                        <mat-label>Primary Language</mat-label>
                        <mat-select formControlName="primaryLanguage">
                          <mat-option value="">Select a language</mat-option>
                          <mat-option value="javascript">JavaScript</mat-option>
                          <mat-option value="typescript">TypeScript</mat-option>
                          <mat-option value="python">Python</mat-option>
                          <mat-option value="java">Java</mat-option>
                          <mat-option value="csharp">C#</mat-option>
                          <mat-option value="go">Go</mat-option>
                          <mat-option value="rust">Rust</mat-option>
                        </mat-select>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Framework</mat-label>
                        <mat-select formControlName="framework">
                          <mat-option value="">Select a framework</mat-option>
                          <mat-option value="angular">Angular</mat-option>
                          <mat-option value="react">React</mat-option>
                          <mat-option value="vue">Vue.js</mat-option>
                          <mat-option value="svelte">Svelte</mat-option>
                          <mat-option value="express">Express.js</mat-option>
                          <mat-option value="fastapi">FastAPI</mat-option>
                          <mat-option value="springboot">Spring Boot</mat-option>
                          <mat-option value="django">Django</mat-option>
                        </mat-select>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Architecture Style</mat-label>
                        <mat-select formControlName="architectureStyle">
                          <mat-option value="">Select architecture</mat-option>
                          <mat-option value="monolithic">Monolithic</mat-option>
                          <mat-option value="microservices">Microservices</mat-option>
                          <mat-option value="serverless">Serverless</mat-option>
                          <mat-option value="jamstack">JAMstack</mat-option>
                          <mat-option value="mvc">MVC</mat-option>
                          <mat-option value="clean">Clean Architecture</mat-option>
                        </mat-select>
                      </mat-form-field>
                    </div>
                  </div>
                </mat-tab>
              </mat-tab-group>

              <!-- Selected Items Summary -->
              @if (selectedAgentsCount() > 0 || selectedTechStackCount() > 0) {
                <div class="selection-summary">
                  <h3>Current Selection</h3>
                  
                  @if (selectedAgentsCount() > 0) {
                    <div class="summary-section">
                      <h4>Selected Agents ({{ selectedAgentsCount() }})</h4>
                      <div class="selected-chips">
                        @for (agentId of getSelectedAgentIds(); track agentId) {
                          <mat-chip-option class="selected-chip" 
                                          (removed)="toggleAgentSelection(agentId)">
                            {{ getAgentName(agentId) }}
                            <mat-icon matChipRemove>cancel</mat-icon>
                          </mat-chip-option>
                        }
                      </div>
                    </div>
                  }

                  @if (selectedTechStackCount() > 0) {
                    <div class="summary-section">
                      <h4>Selected Tech Stack ({{ selectedTechStackCount() }})</h4>
                      <div class="selected-chips">
                        @for (techStackId of getSelectedTechStackIds(); track techStackId) {
                          <mat-chip-option class="selected-chip" 
                                          (removed)="toggleTechStackSelection(techStackId)">
                            {{ getTechStackName(techStackId) }}
                            <mat-icon matChipRemove>cancel</mat-icon>
                          </mat-chip-option>
                        }
                      </div>
                    </div>
                  }
                </div>
              }

            </form>
          }

          @if (agentService.error()) {
            <div class="error-message">
              <mat-icon>error</mat-icon>
              <span>{{ agentService.error() }}</span>
              <button mat-button (click)="agentService.clearError()">Dismiss</button>
            </div>
          }
        </mat-card-content>

        <mat-card-actions class="card-actions">
          <button mat-button 
                  (click)="onClearSelection()" 
                  [disabled]="agentService.loading()">
            Clear All
          </button>
          <button mat-raised-button 
                  color="primary" 
                  (click)="onSaveSelection()"
                  [disabled]="agentService.loading() || (!selectedAgentsCount() && !selectedTechStackCount())">
            Save Configuration
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styleUrls: ['./agent-select.component.scss']
})
export class AgentSelectComponent implements OnInit {
  // Input for project ID
  projectId = input.required<string>();
  
  // Form for managing selections
  selectionForm: FormGroup;
  
  // Search and filter state
  techStackSearch = '';
  selectedTechStackCategory = '';
  
  // Internal state signals
  private selectedAgents = signal<Set<string>>(new Set());
  private selectedTechStack = signal<Set<string>>(new Set());

  // Computed values
  agentCategories = computed(() => this.agentService.getAgentCategories() || []);
  techStackCategories = computed(() => this.agentService.getTechStackCategories() || []);
  
  filteredTechStackOptions = computed(() => {
    let options = this.agentService.techStackOptions() || [];
    
    // Filter by category
    if (this.selectedTechStackCategory) {
      options = options.filter(option => option.category === this.selectedTechStackCategory);
    }
    
    // Filter by search
    if (this.techStackSearch.trim()) {
      const searchTerm = this.techStackSearch.toLowerCase();
      options = options.filter(option =>
        option.name?.toLowerCase().includes(searchTerm) ||
        option.description?.toLowerCase().includes(searchTerm) ||
        (option.tags || []).some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    return options;
  });

  selectedAgentsCount = computed(() => this.selectedAgents().size);
  selectedTechStackCount = computed(() => this.selectedTechStack().size);

  constructor(
    public agentService: AgentService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.selectionForm = this.fb.group({
      primaryLanguage: [''],
      framework: [''],
      architectureStyle: ['']
    });
  }

  ngOnInit(): void {
    // Load initial data
    this.loadData();
    
    // Load existing selection for this project
    this.loadProjectSelection();
  }

  private loadData(): void {
    this.agentService.refreshAll().subscribe({
      next: () => {
        // Data loaded successfully
      },
      error: (error) => {
        this.snackBar.open('Failed to load configuration options', 'Close', {
          duration: 5000
        });
      }
    });
  }

  private loadProjectSelection(): void {
    this.agentService.loadProjectSelection(this.projectId()).subscribe({
      next: (selection) => {
        // Update selected items
        this.selectedAgents.set(new Set(selection.selectedAgents));
        this.selectedTechStack.set(new Set(selection.selectedTechStack));
        
        // Update form with preferences
        if (selection.preferences) {
          this.selectionForm.patchValue(selection.preferences);
        }
      },
      error: (error) => {
        // If no selection exists (404), that's fine - start with empty selection
        if (error.status !== 404) {
          this.snackBar.open('Failed to load existing configuration', 'Close', {
            duration: 5000
          });
        }
      }
    });
  }

  getAgentsByCategory(category: string): Agent[] {
    return this.agentService.getAgentsByCategory(category) || [];
  }

  isAgentSelected(agentId: string): boolean {
    return this.selectedAgents().has(agentId);
  }

  isTechStackSelected(techStackId: string): boolean {
    return this.selectedTechStack().has(techStackId);
  }

  toggleAgentSelection(agentId: string): void {
    const current = new Set(this.selectedAgents());
    if (current.has(agentId)) {
      current.delete(agentId);
    } else {
      current.add(agentId);
    }
    this.selectedAgents.set(current);
  }

  toggleTechStackSelection(techStackId: string): void {
    const current = new Set(this.selectedTechStack());
    if (current.has(techStackId)) {
      current.delete(techStackId);
    } else {
      current.add(techStackId);
    }
    this.selectedTechStack.set(current);
  }

  onTechStackSearch(): void {
    // The computed property will automatically update
  }

  onCategoryFilter(): void {
    // The computed property will automatically update
  }

  getSelectedAgentIds(): string[] {
    return Array.from(this.selectedAgents());
  }

  getSelectedTechStackIds(): string[] {
    return Array.from(this.selectedTechStack());
  }

  getAgentName(agentId: string): string {
    const agents = this.agentService.agents() || [];
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || agentId;
  }

  getTechStackName(techStackId: string): string {
    const options = this.agentService.techStackOptions() || [];
    const option = options.find(o => o.id === techStackId);
    return option?.name || techStackId;
  }

  onClearSelection(): void {
    this.selectedAgents.set(new Set());
    this.selectedTechStack.set(new Set());
    this.selectionForm.reset();
  }

  onSaveSelection(): void {
    const selection: SaveSelectionRequest = {
      selectedAgents: Array.from(this.selectedAgents()),
      selectedTechStack: Array.from(this.selectedTechStack()),
      preferences: this.selectionForm.value
    };

    this.agentService.saveProjectSelection(this.projectId(), selection).subscribe({
      next: () => {
        this.snackBar.open('Configuration saved successfully', 'Close', {
          duration: 3000
        });
      },
      error: () => {
        this.snackBar.open('Failed to save configuration', 'Close', {
          duration: 5000
        });
      }
    });
  }
}

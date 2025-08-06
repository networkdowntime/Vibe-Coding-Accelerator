import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { AgentSelectComponent } from './agent-select.component';
import { AgentService, TechStack } from '../../services/agent.service';
import { of, throwError } from 'rxjs';

describe('AgentSelectComponent', () => {
  let component: AgentSelectComponent;
  let fixture: ComponentFixture<AgentSelectComponent>;
  let agentService: jasmine.SpyObj<AgentService>;
  let httpMock: HttpTestingController;

  const mockAgents = [
    { id: 'githubCopilot', name: 'Github Copilot' },
    { id: 'chatGpt', name: 'Chat Gpt' },
    { id: 'claude', name: 'Claude' }
  ];

        const mockTechStacks: TechStack[] = [
        { id: 'javascript', type: 'language', typeDisplayName: 'Language', name: 'javascript', displayName: 'JavaScript' },
        { id: 'angular', type: 'framework', typeDisplayName: 'Framework', name: 'angular', displayName: 'Angular' },
        { id: 'react', type: 'framework', typeDisplayName: 'Framework', name: 'react', displayName: 'React' }
      ];

  beforeEach(async () => {
    const agentServiceSpy = jasmine.createSpyObj('AgentService', [
      'getAgents',
      'getTechStacks',
      'getProjectTechStack',
      'saveTechStack',
      'setSelectedAgent',
      'setSelectedTechStack'
    ], {
      selectedAgent$: of(null),
      selectedTechStack$: of([])
    });

    await TestBed.configureTestingModule({
      imports: [
        AgentSelectComponent,
        HttpClientTestingModule,
        FormsModule
      ],
      providers: [
        { provide: AgentService, useValue: agentServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AgentSelectComponent);
    component = fixture.componentInstance;
    agentService = TestBed.inject(AgentService) as jasmine.SpyObj<AgentService>;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should load agents on init', () => {
      agentService.getAgents.and.returnValue(of(mockAgents));
      agentService.getProjectTechStack.and.returnValue(of({ techStack: [], aiAgent: null }));

      component.projectName = 'testProject';
      component.ngOnInit();

      expect(agentService.getAgents).toHaveBeenCalled();
      expect(component.availableAgents).toEqual(mockAgents);
      expect(component.isLoadingAgents).toBeFalse();
    });

    it('should load project tech stack on init when project name is provided', () => {
      agentService.getAgents.and.returnValue(of(mockAgents));
      agentService.getProjectTechStack.and.returnValue(of({ techStack: ['javascript', 'typescript'], aiAgent: null }));

      component.projectName = 'testProject';
      component.ngOnInit();

      expect(agentService.getProjectTechStack).toHaveBeenCalledWith('testProject');
      expect(component.selectedTechStacks).toEqual(['javascript', 'typescript']);
    });

    it('should not load project tech stack when project name is empty', () => {
      agentService.getAgents.and.returnValue(of(mockAgents));

      component.projectName = '';
      component.ngOnInit();

      expect(agentService.getProjectTechStack).not.toHaveBeenCalled();
    });
  });

  describe('Agent Selection', () => {
    beforeEach(() => {
      agentService.getAgents.and.returnValue(of(mockAgents));
      agentService.getProjectTechStack.and.returnValue(of({ techStack: [], aiAgent: null }));
      component.ngOnInit();
    });

    it('should load tech stacks when agent is selected', () => {
      agentService.getTechStacks.and.returnValue(of(mockTechStacks));

      component.selectedAgent = mockAgents[0];
      component.onAgentChange();

      expect(agentService.setSelectedAgent).toHaveBeenCalledWith(mockAgents[0]);
      expect(agentService.getTechStacks).toHaveBeenCalledWith('githubCopilot');
      expect(component.availableTechStacks).toEqual(mockTechStacks);
    });

    it('should clear tech stacks when no agent is selected', () => {
      component.selectedAgent = null;
      component.onAgentChange();

      expect(agentService.setSelectedAgent).toHaveBeenCalledWith(null);
      expect(component.availableTechStacks).toEqual([]);
      expect(component.filteredTechStacks).toEqual([]);
    });

    it('should emit agent changed event', () => {
      agentService.getTechStacks.and.returnValue(of(mockTechStacks));
      spyOn(component.agentChanged, 'emit');

      component.selectedAgent = mockAgents[0];
      component.onAgentChange();

      expect(component.agentChanged.emit).toHaveBeenCalledWith(mockAgents[0]);
    });
  });

  describe('Tech Stack Management', () => {
    beforeEach(() => {
      agentService.getAgents.and.returnValue(of(mockAgents));
      agentService.getProjectTechStack.and.returnValue(of({ techStack: [], aiAgent: null }));
      agentService.getTechStacks.and.returnValue(of(mockTechStacks));
      agentService.saveTechStack.and.returnValue(of({ message: 'Saved', techStack: [] }));
      
      component.projectName = 'testProject';
      component.selectedAgent = mockAgents[0];
      component.availableTechStacks = mockTechStacks;
      component.ngOnInit();
    });

    it('should add tech stack item', () => {
      spyOn(component.techStackChanged, 'emit');

      component.addTechStack(mockTechStacks[0]); // JavaScript tech stack

      expect(component.selectedTechStacks).toContain('javascript');
      expect(agentService.setSelectedTechStack).toHaveBeenCalledWith(['javascript']);
      expect(component.techStackChanged.emit).toHaveBeenCalledWith(['javascript']);
      expect(agentService.saveTechStack).toHaveBeenCalledWith('testProject', ['javascript'], 'githubCopilot');
    });

    it('should not add duplicate tech stack item', () => {
      component.selectedTechStacks = ['javascript'];

      component.addTechStack(mockTechStacks[0]); // JavaScript tech stack

      expect(component.selectedTechStacks).toEqual(['javascript']);
    });

    it('should remove tech stack item', () => {
      spyOn(component.techStackChanged, 'emit');
      component.selectedTechStacks = ['javascript', 'typescript'];

      component.removeTechStack('javascript');

      expect(component.selectedTechStacks).toEqual(['typescript']);
      expect(agentService.setSelectedTechStack).toHaveBeenCalledWith(['typescript']);
      expect(component.techStackChanged.emit).toHaveBeenCalledWith(['typescript']);
    });

    it('should clear input after adding tech stack', () => {
      component.techStackInput = 'javascript';

      component.addTechStack(mockTechStacks[0]);

      expect(component.techStackInput).toBe('');
    });
  });

  describe('Tech Stack Filtering', () => {
    beforeEach(() => {
      component.availableTechStacks = mockTechStacks;
      component.selectedTechStacks = [];
    });

    it('should filter tech stacks based on input', () => {
      component.techStackInput = 'java';
      component['filterTechStacks']();

      expect(component.filteredTechStacks).toEqual([
        { id: 'javascript', type: 'language', typeDisplayName: 'Language', name: 'javascript', displayName: 'JavaScript' }
      ]);
    });

    it('should exclude already selected tech stacks from filter', () => {
      component.selectedTechStacks = ['javascript'];
      component.techStackInput = 'java';
      component['filterTechStacks']();

      expect(component.filteredTechStacks).toEqual([]);
    });

    it('should show autocomplete when input has value and results exist', () => {
      component.techStackInput = 'java';
      component['filterTechStacks']();

      expect(component.showAutocomplete).toBeTrue();
    });

    it('should hide autocomplete when no results', () => {
      component.techStackInput = 'xyz';
      component['filterTechStacks']();

      expect(component.showAutocomplete).toBeFalse();
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      component.availableTechStacks = mockTechStacks;
      component.filteredTechStacks = [mockTechStacks[0]];
    });

    it('should add first filtered tech stack on Enter key', () => {
      spyOn(component, 'addTechStack');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(event, 'preventDefault');

      component.onTechStackInputKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.addTechStack).toHaveBeenCalledWith(mockTechStacks[0]);
    });

    it('should hide autocomplete on Escape key', () => {
      component.showAutocomplete = true;
      component.techStackInput = 'test';
      const event = new KeyboardEvent('keydown', { key: 'Escape' });

      component.onTechStackInputKeydown(event);

      expect(component.showAutocomplete).toBeFalse();
      expect(component.techStackInput).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should emit error when agents loading fails', () => {
      agentService.getAgents.and.returnValue(throwError('Network error'));
      spyOn(component.error, 'emit');

      component.ngOnInit();

      expect(component.error.emit).toHaveBeenCalledWith('Failed to load AI agents');
      expect(component.isLoadingAgents).toBeFalse();
    });

    it('should emit error when tech stacks loading fails', () => {
      agentService.getTechStacks.and.returnValue(throwError('Network error'));
      spyOn(component.error, 'emit');

      component.selectedAgent = mockAgents[0];
      component.onAgentChange();

      expect(component.error.emit).toHaveBeenCalledWith('Failed to load tech stacks');
      expect(component.isLoadingTechStacks).toBeFalse();
    });

    it('should emit error when saving tech stack fails', () => {
      agentService.saveTechStack.and.returnValue(throwError('Save error'));
      spyOn(component.error, 'emit');

      component.projectName = 'testProject';
      component['saveTechStack']();

      expect(component.error.emit).toHaveBeenCalledWith('Failed to save tech stack');
    });
  });

  describe('Input Focus and Blur', () => {
    it('should show autocomplete on focus when results exist', () => {
      component.availableTechStacks = mockTechStacks;
      component.selectedTechStacks = [];
      spyOn(component, 'filterTechStacks' as any);

      component.onTechStackInputFocus();

      expect(component['filterTechStacks']).toHaveBeenCalled();
    });

    it('should hide autocomplete on blur with delay', (done) => {
      component.showAutocomplete = true;

      component.onTechStackInputBlur();

      setTimeout(() => {
        expect(component.showAutocomplete).toBeFalse();
        done();
      }, 250);
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AgentService, Agent, TechStack } from './agent.service';

describe('AgentService', () => {
  let service: AgentService;
  let httpMock: HttpTestingController;

  const mockAgents: Agent[] = [
    { id: 'githubCopilot', name: 'Github Copilot' },
    { id: 'chatGpt', name: 'Chat Gpt' }
  ];

  const mockTechStacks: TechStack[] = [
    { id: 'javascript', name: 'Javascript', displayName: 'javascript' },
    { id: 'typescript', name: 'Typescript', displayName: 'typescript' }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AgentService]
    });
    service = TestBed.inject(AgentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAgents', () => {
    it('should return agents from API', () => {
      service.getAgents().subscribe(agents => {
        expect(agents).toEqual(mockAgents);
      });

      const req = httpMock.expectOne('/api/agents');
      expect(req.request.method).toBe('GET');
      req.flush({ agents: mockAgents });
    });

    it('should return empty array on error', () => {
      service.getAgents().subscribe(agents => {
        expect(agents).toEqual([]);
      });

      const req = httpMock.expectOne('/api/agents');
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('getTechStacks', () => {
    it('should return tech stacks for agent', () => {
      const agentId = 'githubCopilot';

      service.getTechStacks(agentId).subscribe(techStacks => {
        expect(techStacks).toEqual(mockTechStacks);
      });

      const req = httpMock.expectOne(`/api/agents/${agentId}/tech-stacks`);
      expect(req.request.method).toBe('GET');
      req.flush({ techStacks: mockTechStacks });
    });

    it('should return empty array on error', () => {
      service.getTechStacks('githubCopilot').subscribe(techStacks => {
        expect(techStacks).toEqual([]);
      });

      const req = httpMock.expectOne('/api/agents/githubCopilot/tech-stacks');
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('saveTechStack', () => {
    it('should save tech stack to project', () => {
      const projectName = 'testProject';
      const techStack = ['javascript', 'typescript'];
      const expectedResponse = { message: 'Saved', techStack };

      service.saveTechStack(projectName, techStack).subscribe(response => {
        expect(response).toEqual(expectedResponse);
      });

      const req = httpMock.expectOne(`/api/projects/${projectName}/tech-stack`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ techStack });
      req.flush(expectedResponse);
    });

    it('should handle save errors', () => {
      service.saveTechStack('testProject', ['javascript']).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => expect(error).toBeTruthy()
      });

      const req = httpMock.expectOne('/api/projects/testProject/tech-stack');
      req.error(new ErrorEvent('Save error'));
    });
  });

  describe('getProjectTechStack', () => {
    it('should return project tech stack', () => {
      const projectName = 'testProject';
      const expectedTechStack = ['javascript', 'typescript'];

      service.getProjectTechStack(projectName).subscribe(techStack => {
        expect(techStack).toEqual(expectedTechStack);
      });

      const req = httpMock.expectOne(`/api/projects/${projectName}/tech-stack`);
      expect(req.request.method).toBe('GET');
      req.flush({ techStack: expectedTechStack });
    });

    it('should return empty array on error', () => {
      service.getProjectTechStack('testProject').subscribe(techStack => {
        expect(techStack).toEqual([]);
      });

      const req = httpMock.expectOne('/api/projects/testProject/tech-stack');
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('State Management', () => {
    it('should manage selected agent state', () => {
      const agent = mockAgents[0];

      service.setSelectedAgent(agent);
      expect(service.getSelectedAgent()).toEqual(agent);

      service.selectedAgent$.subscribe(selectedAgent => {
        expect(selectedAgent).toEqual(agent);
      });
    });

    it('should manage selected tech stack state', () => {
      const techStack = ['javascript', 'typescript'];

      service.setSelectedTechStack(techStack);
      expect(service.getSelectedTechStack()).toEqual(techStack);

      service.selectedTechStack$.subscribe(selectedTechStack => {
        expect(selectedTechStack).toEqual(techStack);
      });
    });

    it('should add tech stack item without duplicates', () => {
      service.setSelectedTechStack(['javascript']);

      service.addTechStackItem('typescript');
      expect(service.getSelectedTechStack()).toEqual(['javascript', 'typescript']);

      // Should not add duplicate
      service.addTechStackItem('javascript');
      expect(service.getSelectedTechStack()).toEqual(['javascript', 'typescript']);
    });

    it('should remove tech stack item', () => {
      service.setSelectedTechStack(['javascript', 'typescript', 'angular']);

      service.removeTechStackItem('typescript');
      expect(service.getSelectedTechStack()).toEqual(['javascript', 'angular']);
    });
  });

  describe('Observables', () => {
    it('should emit initial state', (done) => {
      service.selectedAgent$.subscribe(agent => {
        expect(agent).toBeNull();
        done();
      });
    });

    it('should emit tech stack changes', (done) => {
      const techStack = ['javascript'];
      
      service.selectedTechStack$.subscribe(selectedTechStack => {
        if (selectedTechStack.length > 0) {
          expect(selectedTechStack).toEqual(techStack);
          done();
        }
      });

      service.setSelectedTechStack(techStack);
    });
  });
});

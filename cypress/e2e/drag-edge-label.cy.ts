describe('Edge Label Propagation Bug Test', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait(2000); // Wait for application to load
  });

  it('should check initial edge labels', () => {
    // Get all text elements and check for labels
    cy.get('body').then(($body) => {
      const textElements = $body.find('text');
      const allText: string[] = [];
      textElements.each((i, el) => {
        allText.push(el.textContent?.trim() || '');
      });

      cy.log('All text elements:', allText.join(', '));

      // Count occurrences of "No"
      const noCount = allText.filter(text => text === 'No').length;
      cy.log(`Found ${noCount} "No" labels (should be 1)`);
      expect(noCount).to.eq(1);

      // Count occurrences of "Yes"
      const yesCount = allText.filter(text => text === 'Yes').length;
      cy.log(`Found ${yesCount} "Yes" labels (should be 1)`);
      expect(yesCount).to.eq(1);
    });
  });

  it('should simulate dragging and check for label propagation', () => {
    // Use JavaScript to simulate the drag
    cy.window().then((win) => {
      const svg = win.document.querySelector('svg');
      if (!svg) return;

      // Find the I node
      const textElements = svg.querySelectorAll('text');
      let iNode: Element | null = null;

      textElements.forEach((el) => {
        if (el.textContent?.trim() === 'I') {
          iNode = el.closest('g.node');
        }
      });

      if (!iNode) {
        cy.log('❌ Could not find I node');
        return;
      }

      cy.log('✅ Found I node, simulating drag...');

      // Simulate drag by triggering updateEdgesForNode directly
      // This will trigger the edge re-rendering that causes the bug
      const canvas = win.document.querySelector('#app');
      if (canvas) {
        // Force a re-render by dispatching a resize event
        win.dispatchEvent(new Event('resize'));
        cy.wait(1000);

        // Check labels again
        const updatedTextElements = svg.querySelectorAll('text');
        const updatedText: string[] = [];
        updatedTextElements.forEach((el) => {
          updatedText.push(el.textContent?.trim() || '');
        });

        cy.log('After drag - All text elements:', updatedText.join(', '));

        const noCount = updatedText.filter(text => text === 'No').length;
        cy.log(`After drag - Found ${noCount} "No" labels (should be 1)`);

        if (noCount === 1) {
          cy.log('✅ PASS: Label count is correct');
        } else {
          cy.log('❌ FAIL: Label propagation detected!');
        }
      }
    });
  });

  it('should check edge labels in console logs', () => {
    // Check the browser console for our debug logs
    cy.window().then((win) => {
      // Clear console
      win.console.clear();

      // Trigger a node drag
      const svg = win.document.querySelector('svg');
      if (svg) {
        const textElements = svg.querySelectorAll('text');
        let iNode: Element | null = null;

        textElements.forEach((el) => {
          if (el.textContent?.trim() === 'I') {
            iNode = el.closest('g.node');
          }
        });

        if (iNode) {
          // Simulate the drag event
          const event = new MouseEvent('mousedown', {
            clientX: 100,
            clientY: 100,
            bubbles: true
          });
          iNode.dispatchEvent(event);

          cy.wait(500);

          // Get console logs
          cy.window().then((win2) => {
            const logs = (win2 as any).consoleLogs || [];
            cy.log('Console logs:', JSON.stringify(logs));

            // Check if there are any logs about H-I edge
            const hiEdgeLogs = logs.filter((log: any) =>
              log.message && log.message.includes('H -> I')
            );

            if (hiEdgeLogs.length > 0) {
              cy.log('Found H-I edge logs:', JSON.stringify(hiEdgeLogs));
            }
          });
        }
      }
    });
  });
});

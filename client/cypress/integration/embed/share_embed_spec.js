import { createQuery } from '../../support/redash-api';

describe('Embedded Queries', () => {
  beforeEach(() => {
    cy.login();
  });

  it('are shared without parameters', () => {
    createQuery({ query: 'select * from users' })
      .then((query) => {
        cy.visit(`/queries/${query.id}/source`);
        cy.getByTestId('ExecuteButton').click();
        cy.getByTestId('QueryPageVisualizationTabs', { timeout: 10000 }).should('exist');
        cy.clickThrough(`
          QueryControlDropdownButton
          ShowEmbedDialogButton
        `);
        cy.getByTestId('EmbedIframe')
          .invoke('text')
          .then((iframe) => {
            const embedUrl = iframe.match(/"(.*?)"/)[1];
            cy.logout();
            cy.visit(embedUrl);
            cy.getByTestId('VisualizationEmbed', { timeout: 10000 }).should('exist');
            cy.getByTestId('TimeAgo', { timeout: 10000 }).should('exist');
            cy.percySnapshot('Successfully Embedded Non-Parameterized Query');
          });
      });
  });

  it('are shared with safe parameters', () => {
    cy.visit('/queries/new');
    cy.getByTestId('QueryEditor')
      .get('.ace_text-input')
      .type("SELECT name, slug FROM organizations WHERE id='{{}{{}id}}'{esc}", { force: true });

    cy.getByTestId('TextParamInput').type('1');
    cy.clickThrough(`
      ParameterSettings-id
      ParameterTypeSelect
      NumberParameterTypeOption
      SaveParameterSettings
      ExecuteButton
      SaveButton
    `);

    cy.location('search').should('eq', '?p_id=1');
    cy.clickThrough(`
      QueryControlDropdownButton
      ShowEmbedDialogButton
    `);

    cy.getByTestId('EmbedIframe')
      .invoke('text')
      .then((iframe) => {
        const embedUrl = iframe.match(/"(.*?)"/)[1];
        cy.logout();
        cy.visit(embedUrl);
        cy.getByTestId('VisualizationEmbed', { timeout: 10000 }).should('exist');
        cy.getByTestId('TimeAgo', { timeout: 10000 }).should('exist');
        cy.percySnapshot('Successfully Embedded Parameterized Query');
      });
  });

  it('cannot be shared with unsafe parameters', () => {
    cy.visit('/queries/new');
    cy.getByTestId('QueryEditor')
      .get('.ace_text-input')
      .type("SELECT name, slug FROM organizations WHERE name='{{}{{}name}}'{esc}", { force: true });

    cy.getByTestId('TextParamInput').type('Redash');
    cy.clickThrough(`
      ParameterSettings-name
      ParameterTypeSelect
      TextParameterTypeOption
      SaveParameterSettings
      ExecuteButton
      SaveButton
    `);

    cy.location('search').should('eq', '?p_name=Redash');
    cy.clickThrough(`
      QueryControlDropdownButton
      ShowEmbedDialogButton
    `);

    cy.getByTestId('EmbedIframe')
      .invoke('text')
      .then((iframe) => {
        const embedUrl = iframe.match(/"(.*?)"/)[1];
        cy.logout();
        cy.visit(embedUrl, { failOnStatusCode: false }); // prevent 403 from failing test
        cy.getByTestId('ErrorMessage', { timeout: 10000 })
          .should('exist')
          .contains("Can't embed");
        cy.percySnapshot('Unsuccessfully Embedded Parameterized Query');
      });
  });
});

/**
 * @jest-environment jsdom
 */

import { screen } from "@testing-library/dom";
// Permet d’accéder aux éléments HTML (DOM) pendant les tests.

import NewBillUI from "../views/NewBillUI.js";
// Importe le code HTML de la page "Nouvelle note de frais".

import NewBill from "../containers/NewBill.js";
// Importe la classe qui contient la logique pour gérer la création d’une nouvelle note de frais.

describe("Given I am connected as an employee", () => {
  // Débute la suite de tests en supposant qu'on est connecté en tant qu'employé.

  let mockStore; // Simule le "store" (base de données ou API)
  let onNavigate; // Fonction qui simule la navigation vers une autre page

  beforeEach(() => {
    // Cette fonction est exécutée avant chaque test

    onNavigate = jest.fn(); // Crée une fausse fonction de navigation

    // On simule le localStorage pour faire croire qu'un utilisateur est connecté
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(() => JSON.stringify({ email: "test@employee.com" })),
        setItem: jest.fn(),
      },
      writable: true,
    });

    // On crée un faux store avec des méthodes `create` et `update` simulées
    mockStore = {
      bills: jest.fn(() => ({
        create: jest.fn(
          () => Promise.resolve({ fileUrl: "https://test.file", key: "1234" }) // Simule la création d'un fichier avec un lien et un identifiant
        ),
        update: jest.fn(() => Promise.resolve()), // Simule une mise à jour réussie
      })),
    };

    // On affiche la page de création de note de frais dans le DOM
    document.body.innerHTML = NewBillUI();
  });

  describe("When I am on NewBill Page", () => {
    test("Then the form should be displayed", () => {
      // Vérifie que le formulaire est bien présent
      expect(screen.getByTestId("form-new-bill")).toBeTruthy();
    });

    describe("When user uploads a valid file", () => {
      test("Then handleChangeFile updates fileUrl, fileName and billId", async () => {
        // Simule l'envoi d’un fichier image valide

        const onNavigate = jest.fn(); // Fausse navigation

        const createMock = jest.fn(
          () => Promise.resolve({ fileUrl: "https://test.file", key: "1234" }) // Fichier "uploadé"
        );

        const mockStore = {
          bills: () => ({
            create: createMock, // Méthode simulée pour enregistrer le fichier
          }),
        };

        // Simule un utilisateur connecté
        window.localStorage.setItem(
          "user",
          JSON.stringify({ email: "test@employee.com" })
        );

        // Instancie NewBill avec les paramètres simulés
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        // On crée un faux fichier image
        const fileInput = screen.getByTestId("file");
        const file = new File(["image"], "test.jpg", { type: "image/jpeg" });

        // On force l’input fichier à contenir ce fichier
        Object.defineProperty(fileInput, "files", {
          value: [file],
        });

        const event = {
          preventDefault: jest.fn(),
          target: { value: "C:\\fakepath\\test.jpg" },
        };

        // On appelle la fonction qui gère le changement de fichier
        await newBill.handleChangeFile(event);

        // On vérifie que la fonction de création a bien été appelée
        expect(createMock).toHaveBeenCalled();

        // Et que les propriétés ont bien été mises à jour
        expect(newBill.fileUrl).toBe("https://test.file");
        expect(newBill.fileName).toBe("test.jpg");
        expect(newBill.billId).toBe("1234");
      });
    });

    describe("When user uploads an invalid file", () => {
      test("Then alert is called and input value reset", () => {
        // Simule l’envoi d’un fichier invalide (ex: .exe)

        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const fileInput = screen.getByTestId("file");
        const file = new File(["exe content"], "fake.exe", {
          type: "application/x-msdownload",
        });

        Object.defineProperty(fileInput, "files", {
          value: [file],
        });

        const alertMock = jest
          .spyOn(window, "alert") // On espionne la méthode alert
          .mockImplementation(() => {});

        const event = {
          preventDefault: jest.fn(),
          target: { value: "C:\\fakepath\\fake.exe" },
        };

        newBill.handleChangeFile(event);

        // Vérifie que l'alerte s'affiche
        expect(alertMock).toHaveBeenCalledWith(
          "Seuls les fichiers jpg, jpeg ou png sont acceptés."
        );

        // Vérifie que l'input est vidé
        expect(fileInput.value).toBe("");

        alertMock.mockRestore(); // On remet alert dans son état d’origine
      });
    });

    describe("When submitting the form", () => {
      test("Then handleSubmit calls updateBill and navigates", async () => {
        // Teste le comportement lors de l’envoi du formulaire avec des données valides

        const onNavigate = jest.fn();

        window.localStorage.setItem(
          "user",
          JSON.stringify({ email: "test@employee.com" })
        );

        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const updateBillSpy = jest.spyOn(newBill, "updateBill"); // On observe cette méthode

        // On remplit tous les champs du formulaire
        screen.getByTestId("expense-type").value = "Transports";
        screen.getByTestId("expense-name").value = "Taxi";
        screen.getByTestId("amount").value = "20";
        screen.getByTestId("datepicker").value = "2024-08-06";
        screen.getByTestId("vat").value = "10";
        screen.getByTestId("pct").value = "30";
        screen.getByTestId("commentary").value = "Test commentaire";

        // On simule le fichier déjà uploadé
        newBill.fileUrl = "https://test.file";
        newBill.fileName = "test.jpg";

        const form = screen.getByTestId("form-new-bill");
        const event = { preventDefault: jest.fn(), target: form };

        // On envoie le formulaire
        await newBill.handleSubmit(event);

        // Vérifie que updateBill est bien appelé avec les bonnes infos
        expect(updateBillSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            email: "test@employee.com",
            type: "Transports",
            name: "Taxi",
            amount: 20,
            date: "2024-08-06",
            vat: "10",
            pct: 30,
            commentary: "Test commentaire",
            fileUrl: "https://test.file",
            fileName: "test.jpg",
            status: "pending",
          })
        );

        // Vérifie qu'on a bien été redirigé vers la page des notes
        expect(onNavigate).toHaveBeenCalledWith("#employee/bills");
      });

      test("Then pct defaults to 20 if empty", () => {
        // Vérifie que si le champ `pct` est vide, il prend par défaut la valeur 20

        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        newBill.updateBill = jest.fn(); // On espionne cette méthode

        // On remplit les champs du formulaire sauf le `pct`
        screen.getByTestId("expense-type").value = "Transports";
        screen.getByTestId("expense-name").value = "Taxi";
        screen.getByTestId("amount").value = "20";
        screen.getByTestId("datepicker").value = "2024-08-06";
        screen.getByTestId("vat").value = "10";
        screen.getByTestId("pct").value = ""; // champ vide
        screen.getByTestId("commentary").value = "Test commentaire";

        newBill.fileUrl = "https://test.file";
        newBill.fileName = "test.jpg";

        const form = screen.getByTestId("form-new-bill");
        const event = { preventDefault: jest.fn(), target: form };

        newBill.handleSubmit(event);

        // Vérifie que pct est bien défini à 20 par défaut
        expect(newBill.updateBill).toHaveBeenCalledWith(
          expect.objectContaining({
            pct: 20,
          })
        );
      });
    });

    describe("updateBill function", () => {
      test("calls store update and navigates on success", async () => {
        // Vérifie que la méthode updateBill fonctionne correctement

        const onNavigate = jest.fn();

        const updateMock = jest.fn(() => Promise.resolve());
        const mockStore = {
          bills: () => ({
            update: updateMock,
          }),
        };

        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        newBill.billId = "1234"; // On simule un ID de note déjà existante
        const bill = { foo: "bar" }; // Données factices

        await newBill.updateBill(bill);

        // Vérifie que l’appel à update est correct
        expect(updateMock).toHaveBeenCalledWith({
          data: JSON.stringify(bill),
          selector: "1234",
        });

        // Vérifie que la navigation a bien eu lieu
        expect(onNavigate).toHaveBeenCalledWith("#employee/bills");
      });
    });
  });
});

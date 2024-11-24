import { Plugin, Setting, PluginSettingTab, App } from "obsidian";

interface MyPluginSettings {
    fileLimit: number;
}
const DEFAULT_SETTINGS: MyPluginSettings = {
	fileLimit: 5,
}
export default class FolderFileLimitPlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        console.log("Folder File Limit Plugin loaded.");

        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        this.addSettingTab(new FileLimitSettingTab(this.app, this));

        this.app.workspace.onLayoutReady(() => {
            this.initializeFileTreeObserver();
        });
    }

    initializeFileTreeObserver() {
        // 获取文件树容器 
        // Get the file tree container
        const fileTree = document.querySelector(".nav-files-container");

        if (!fileTree) {
            console.warn("File list not found // 未找到文件列表");
            return;
        }

        // 使用 MutationObserver 监控文件树变化
        // Use MutationObserver to monitor changes in the file tree
        const observer = new MutationObserver(() => {
            // 暂时断开观察器 
            // Temporarily disconnect the observer
            observer.disconnect();
            this.limitFilesInFolders();
            // 修改完成后重新启动观察器 
            // Restart the observer after modifications
            observer.observe(fileTree, {
                childList: true,
                subtree: true,
            });
        });

        observer.observe(fileTree, {
            childList: true,
            subtree: true,
        });
    }

    limitFilesInFolders() {
        // 获取所有已经展开的文件夹 
        // Get all expanded folders
        const folders = document.querySelectorAll(".tree-item.nav-folder:not(.is-collapsed) .nav-folder-children");

        folders.forEach((folder) => {
            // 跳过已完全展开的文件夹（带有标记的） 
            // Skip folders that are already fully expanded (marked with a flag)
            if (folder.classList.contains("folders-fully-expanded")) return;

            const files = Array.from(folder.querySelectorAll(":scope > .nav-file") as unknown as HTMLElement[]);
            const existingButtonContainer = folder.querySelector(".file-limit-button-container");

            // 如果文件数小于等于 5，移除按钮并标记为已处理 
            // If the number of files is less than or equal to 5, remove the buttons and mark as processed
            if (files.length <= this.settings.fileLimit) {
                if (existingButtonContainer) existingButtonContainer.remove();
                folder.classList.add("folders-fully-expanded");
                return;
            }

            // 显示前 5 个文件，隐藏其余文件 
            // Show the first 5 files and hide the rest
            files.forEach((file, index) => {
                file.style.display = index < this.settings.fileLimit ? "" : "none";
            });

            // 如果已有按钮，跳过创建 
            // Skip creating buttons if they already exist
            if (existingButtonContainer) return;

            // 创建“显示更多”按钮 
            // Create the "Show More" button
            const showMoreButton = new Button({
                className: "show-more-button",
                svg: `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 14.975q-.2 0-.375-.062T11.3 14.7l-4.6-4.6q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l3.9 3.9l3.9-3.9q.275-.275.7-.275t.7.275t.275.7t-.275.7l-4.6 4.6q-.15.15-.325.213t-.375.062"/></svg>
                `,
                onClick: () => {
                    files.forEach((file) => {
                        file.style.display = "";
                    });
                    folder.classList.add("folders-fully-expanded");
                    buttonContainer.remove();
                    // 强制触发 DOM 更新，避免 MutationObserver 误触发
                    folder.dispatchEvent(new Event("DOMSubtreeModified"));

                    setTimeout(() => folder.classList.remove("folders-fully-expanded"), 500);
                },
            }).generate();

            // 创建“永久展开”按钮 
            // Create the "Permanent Expand" button
            const permanentExpandButton = new Button({
                className: "permanent-expand-button",
                svg: `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="m12 16.175l3.9-3.875q.275-.275.688-.288t.712.288q.275.275.275.7t-.275.7l-4.6 4.6q-.15.15-.325.213t-.375.062t-.375-.062t-.325-.213l-4.6-4.6q-.275-.275-.288-.687T6.7 12.3q.275-.275.7-.275t.7.275zm0-6L15.9 6.3q.275-.275.688-.287t.712.287q.275.275.275.7t-.275.7l-4.6 4.6q-.15.15-.325.213t-.375.062t-.375-.062t-.325-.213L6.7 7.7q-.275-.275-.288-.687T6.7 6.3q.275-.275.7-.275t.7.275z"/></svg>
                `,
                onClick: () => {
                    files.forEach((file) => {
                        file.style.display = "";
                    });
                    // 标记为永久展开 
                    // Mark as permanently expanded
                    folder.classList.add("folders-fully-expanded");
                    buttonContainer.remove();
                },
            }).generate();

            // 创建按钮容器 
            // Create a button container
            const buttonContainer = new ButtonContainer({ showMoreButton, permanentExpandButton }).generate();

            // 将容器添加到文件夹 
            // Append the container to the folder
            folder.appendChild(buttonContainer);
        });
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        console.log("Folder File Limit Plugin unloaded.");
    }
};

class Button {
    className: string;
    svg: string;
    onClick: Function;
    constructor({ className, svg, onClick }: { className: string, svg: string, onClick: Function }) {
        this.className = className;
        this.svg = svg;
        this.onClick = onClick;
    }

    generate() {
        const button = document.createElement("div");
        button.classList.add(this.className);
        button.innerHTML = this.svg;
        button.style.display = "inline-flex";
        button.style.margin = "0 7px";
        button.style.cursor = "pointer";
        button.addEventListener("click", this.onClick as any);
        return button;
    }
}

class ButtonContainer {
    showMoreButton: HTMLDivElement;
    permanentExpandButton: HTMLDivElement;
    constructor({ showMoreButton, permanentExpandButton }: { showMoreButton: HTMLDivElement, permanentExpandButton: HTMLDivElement }) {
        this.showMoreButton = showMoreButton;
        this.permanentExpandButton = permanentExpandButton;
    }

    generate() {
        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("file-limit-button-container");
        buttonContainer.style.display = "flex";
        buttonContainer.style.justifyContent = "center";

        buttonContainer.appendChild(this.showMoreButton);
        buttonContainer.appendChild(this.permanentExpandButton);
        return buttonContainer;
    }
}

class FileLimitSettingTab extends PluginSettingTab {
    plugin: FolderFileLimitPlugin;
    constructor(app: App, plugin: FolderFileLimitPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "Folder File Limit Settings" });

        new Setting(containerEl)
            .setName("File Limit")
            .setDesc("Set the maximum number of files to show in expanded folders.")
            .addText((text) =>
                text
                    .setPlaceholder("Enter a number")
                    .setValue(this.plugin.settings.fileLimit.toString())
                    .onChange(async (value) => {
                        if (value.trim() === "") return;

                        const parsedValue = parseInt(value, 10);
                        if (!isNaN(parsedValue) && parsedValue > 0) {
                            this.plugin.settings.fileLimit = parsedValue;
                            await this.plugin.saveSettings();
                        } else {
                            console.warn("Invalid file limit value");
                        }
                    })
            );
    }
}
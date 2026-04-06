import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideFunnel, LucideListFilter, LucideSearch } from '@lucide/angular';

export type FilterOption = {
  value: string;
  label: string;
};

@Component({
  selector: 'app-filters-bar',
  standalone: true,
  imports: [LucideSearch, LucideListFilter, LucideFunnel],
  templateUrl: './filters-bar.component.html',
  styleUrl: './filters-bar.component.scss',
  host: {
    '[class.filtersBarHost--secondary]': 'secondaryFilterOptions.length > 0',
  },
})
export class FiltersBarComponent {
  @Input() searchPlaceholder = 'Поиск...';
  @Input() sortOptions: FilterOption[] = [];
  @Input() filterOptions: FilterOption[] = [];
  /** Второй выпадающий список (например подкатегория); пустой — не рендерится. */
  @Input() secondaryFilterOptions: FilterOption[] = [];
  @Input() selectedSort = '';
  @Input() selectedFilter = '';
  @Input() selectedSecondaryFilter = '';

  @Output() readonly searchChange = new EventEmitter<string>();
  @Output() readonly sortChange = new EventEmitter<string>();
  @Output() readonly filterChange = new EventEmitter<string>();
  @Output() readonly secondaryFilterChange = new EventEmitter<string>();

  onSearch(value: string): void {
    this.searchChange.emit(value);
  }

  onSort(value: string): void {
    this.sortChange.emit(value);
  }

  onFilter(value: string): void {
    this.filterChange.emit(value);
  }

  onSecondaryFilter(value: string): void {
    this.secondaryFilterChange.emit(value);
  }
}



